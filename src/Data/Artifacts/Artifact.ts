import KeyMap, { cacheValueString } from '../../KeyMap';
import { allSubstats, ICachedArtifact, MainStatKey, SubstatKey } from '../../Types/artifact';
import { allRarities, allSlotKeys, ArtifactRarity, ArtifactSetKey, Rarity, SlotKey } from '../../Types/consts';
import { clampPercent, objectKeyMap } from '../../Util/Util';
import { ArtifactSlotsData, ArtifactStarsData } from './ArtifactData';
import ArtifactMainStatsData from './artifact_main_gen.json';
import ArtifactSubstatsData from './artifact_sub_gen.json';
import ArtifactSubstatLookupTable from './artifact_sub_rolls_gen.json';

const maxStar: Rarity = 5

export default class Artifact {
  //do not instantiate.
  constructor() { if (this instanceof Artifact) throw Error('A static class cannot be instantiated.'); }

  //SLOT
  static slotName = (slotKey: SlotKey): string =>
    ArtifactSlotsData[slotKey].name
  static slotMainStats = (slotKey: SlotKey): readonly MainStatKey[] =>
    ArtifactSlotsData[slotKey].stats

  static splitArtifactsBySlot = (databaseObj: ICachedArtifact[]) =>
    objectKeyMap(allSlotKeys, slotKey => databaseObj.filter(art => art.slotKey === slotKey))

  //MAIN STATS
  static mainStatValues = (numStar: Rarity, statKey: MainStatKey): readonly number[] => {
    if (statKey.endsWith('_')) // TODO: % CONVERSION
      return ArtifactMainStatsData[numStar][statKey].map(k => k * 100)
    return ArtifactMainStatsData[numStar][statKey]
  }
  static mainStatValue = (key: MainStatKey, rarity: Rarity, level: number): number =>
    Artifact.mainStatValues(rarity, key)[level]

  //SUBSTATS
  static rollInfo = (rarity: Rarity): { low: number, high: number, numUpgrades: number } =>
    ArtifactStarsData[rarity]

  static maxSubstatValues = (substatKey: SubstatKey, rarity = maxStar): number => {
    if (substatKey.endsWith("_")) // TODO: % CONVERSION
      return Math.max(...ArtifactSubstatsData[rarity][substatKey]) * 100
    return Math.max(...ArtifactSubstatsData[rarity][substatKey])
  }

  static maxSubstatRollEfficiency = objectKeyMap(allRarities,
    rarity => 100 * Math.max(...allSubstats.map(substat =>
      Artifact.maxSubstatValues(substat, rarity) /
      Artifact.maxSubstatValues(substat, maxStar))))

  static totalPossibleRolls = (rarity: Rarity): number =>
    ArtifactStarsData[rarity].high + ArtifactStarsData[rarity].numUpgrades
  static rollsRemaining = (level: number, rarity: Rarity) =>
    Math.ceil((rarity * 4 - level) / 4)
  static getSubstatRollData = (substatKey: SubstatKey, rarity: Rarity) => {
    if (substatKey.endsWith("_")) // TODO: % CONVERSION
      return ArtifactSubstatsData[rarity][substatKey].map(v => v * 100)
    return ArtifactSubstatsData[rarity][substatKey]
  }

  static getSubstatRolls = (substatKey: SubstatKey, substatValue: number, rarity: ArtifactRarity): number[][] => {
    const rollData = Artifact.getSubstatRollData(substatKey, rarity)
    const table = ArtifactSubstatLookupTable[rarity][substatKey]
    const lookupValue = cacheValueString(substatValue, KeyMap.unit(substatKey))
    return table[lookupValue]?.map(roll => roll.map(i => rollData[i])) ?? []
  }
  static getSubstatEfficiency = (substatKey: SubstatKey | "", rolls: number[]): number => {
    const sum = rolls.reduce((a, b) => a + b, 0)
    const max = substatKey ? Artifact.maxSubstatValues(substatKey) * rolls.length : 0
    return max ? clampPercent((sum / max) * 100) : 0
  }

  //ARTIFACT IN GENERAL
  static getArtifactEfficiency(artifact: ICachedArtifact, filter: Set<SubstatKey>): { currentEfficiency: number, maxEfficiency: number } {
    const { substats, rarity, level } = artifact
    // Relative to max star, so comparison between different * makes sense.
    const currentEfficiency = substats.filter(({ key }) => key && filter.has(key)).reduce((sum, { efficiency }) => sum + (efficiency ?? 0), 0)

    const rollsRemaining = Artifact.rollsRemaining(level, rarity);
    const emptySlotCount = substats.filter(s => !s.key).length
    const matchedSlotCount = substats.filter(s => s.key && filter.has(s.key)).length
    const unusedFilterCount = filter.size - matchedSlotCount
    let maxEfficiency
    if (emptySlotCount && unusedFilterCount) maxEfficiency = currentEfficiency + Artifact.maxSubstatRollEfficiency[rarity] * rollsRemaining // Rolls into good empty slot
    else if (matchedSlotCount) maxEfficiency = currentEfficiency + Artifact.maxSubstatRollEfficiency[rarity] * (rollsRemaining - emptySlotCount) // Rolls into existing matched slot
    else maxEfficiency = currentEfficiency // No possible roll

    return { currentEfficiency, maxEfficiency }
  }

  //start with {slotKey:art} end with {setKey:[slotKey]}
  static setToSlots = (artifacts: Dict<SlotKey, ICachedArtifact>): Dict<ArtifactSetKey, SlotKey[]> => {
    const setToSlots: Dict<ArtifactSetKey, SlotKey[]> = {};
    Object.entries(artifacts).forEach(([key, art]) => {
      if (!art) return
      if (setToSlots[art.setKey]) setToSlots[art.setKey]!.push(key)
      else setToSlots[art.setKey] = [key]
    })
    return setToSlots
  }
}
