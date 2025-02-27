import Artifact from "../../Data/Artifacts/Artifact";
import { ascensionMaxLevel } from "../../Data/LevelData";
import { maxBuildsToShowDefault, maxBuildsToShowList } from "../../PageCharacter/CharacterDisplay/Tabs/TabOptimize/Build";
import { initialBuildSettings } from "../../PageCharacter/CharacterDisplay/Tabs/TabOptimize/BuildSetting";
import { allMainStatKeys, allSubstats, IArtifact, ISubstat } from "../../Types/artifact";
import { ICharacter } from "../../Types/character";
import { allArtifactRarities, allArtifactSets, allCharacterKeys, allElements, allHitModes, allReactionModes, allSlotKeys, allWeaponKeys } from "../../Types/consts";
import { IWeapon } from "../../Types/weapon";

// MIGRATION STEP:
// Always keep parsing in sync with the latest DB format.
// If the format becomes incompatible with GOODv1, e.g. DB format becomes GOODv2, update `good.ts`

/**
 * Returns the closest artifact using current db format, or undefined if it's not recoverable
 *
 * **CAUTION**
 * If the format becomes incompatible with GOODv1, update `good.ts`
 */
export function parseArtifact(obj: any): IArtifact | undefined {
  if (typeof obj !== "object") return

  let {
    setKey, rarity, level, slotKey, mainStatKey, substats, location, exclude, lock,
  } = obj ?? {}

  if (!allArtifactSets.includes(setKey) ||
    !allSlotKeys.includes(slotKey) ||
    !allMainStatKeys.includes(mainStatKey) ||
    !allArtifactRarities.includes(rarity) ||
    typeof level !== "number" || level < 0 || level > 20)
    return // non-recoverable

  // TODO:
  // These two requires information from artifact sheet,
  // which normally isn't loaded at this point yet.
  // - Validate artifact set vs slot
  // - Validate artifact set vs rarity
  substats = parseSubstats(substats)
  lock = !!lock
  exclude = !!exclude
  level = Math.round(level)
  const plausibleMainStats = Artifact.slotMainStats(slotKey)
  if (!plausibleMainStats.includes(mainStatKey))
    if (plausibleMainStats.length === 1) mainStatKey = plausibleMainStats[0]
    else return // ambiguous mainstat
  if (!allCharacterKeys.includes(location)) location = ""
  return { setKey, rarity, level, slotKey, mainStatKey, substats, location, exclude, lock }
}
function parseSubstats(obj: any): ISubstat[] {
  if (!Array.isArray(obj))
    return new Array(4).map(_ => ({ key: "", value: 0 }))
  const substats = obj.slice(0, 4).map(({ key = undefined, value = undefined }) => {
    if (!allSubstats.includes(key) || typeof value !== "number" || !isFinite(value))
      return { key: "", value: 0 }
    value = key.endsWith("_") ? Math.round(value * 10) / 10 : Math.round(value)
    return { key, value }
  })
  while (substats.length < 4)
    substats.push({ key: "", value: 0 })

  return substats
}

/**
 * Returns the closest character using current db format, or undefined if it's not recoverable
 *
 * **CAUTION**
 * If the format becomes incompatible with GOODv1, update `good.ts`
 */
export function parseCharacter(obj: any): ICharacter | undefined {
  if (typeof obj !== "object") return

  let {
    key: characterKey, level, ascension, hitMode, elementKey, reactionMode, conditional,
    bonusStats, enemyOverride, talent, infusionAura, constellation, buildSettings, team,
    compareData, favorite
  } = obj

  if (!allCharacterKeys.includes(characterKey) ||
    typeof level !== "number" || level < 0 || level > 90)
    return // non-recoverable

  if (!allHitModes.includes(hitMode)) hitMode = "avgHit"
  if (characterKey !== "Traveler") elementKey = undefined
  else if (!allElements.includes(elementKey)) elementKey = "anemo"
  if (!allReactionModes.includes(reactionMode)) reactionMode = ""
  if (!allElements.includes(infusionAura)) infusionAura = ""
  if (typeof constellation !== "number" && constellation < 0 && constellation > 6) constellation = 0
  if (typeof ascension !== "number" ||
    !(ascension in ascensionMaxLevel) ||
    level > ascensionMaxLevel[ascension] ||
    level < (ascensionMaxLevel[ascension - 1] ?? 0))
    ascension = ascensionMaxLevel.findIndex(maxLvl => level <= maxLvl)
  if (typeof talent !== "object") talent = { auto: 1, skill: 1, burst: 1 }
  else {
    let { auto, skill, burst } = talent
    if (typeof auto !== "number" || auto < 1 || auto > 15) auto = 1
    if (typeof skill !== "number" || skill < 1 || skill > 15) skill = 1
    if (typeof burst !== "number" || burst < 1 || burst > 15) burst = 1
    talent = { auto, skill, burst }
  }
  if (buildSettings && typeof buildSettings === "object") {//buildSettings
    let { setFilters, statFilters, mainStatKeys, optimizationTarget, mainStatAssumptionLevel, useExcludedArts, useEquippedArts, builds, buildDate, maxBuildsToShow, plotBase, compareBuild, levelLow, levelHigh } = buildSettings ?? {}
    if (!Array.isArray(setFilters)) setFilters = initialBuildSettings().setFilters

    //make sure set effects are all numbers
    setFilters = setFilters.map(({ key, num }) => {
      if (Number.isInteger(num)) return { key, num }
      return { key: "", num: 0 }
    })
    //move all the empty entries to the back
    setFilters = [...setFilters.filter(s => s.key), ...setFilters.filter(s => !s.key)]

    if (typeof statFilters !== "object") statFilters = {}

    if (!mainStatKeys || !mainStatKeys.sands || !mainStatKeys.goblet || !mainStatKeys.circlet) {
      const tempmainStatKeys = initialBuildSettings().mainStatKeys
      if (Array.isArray(mainStatKeys)) {
        const [sands, goblet, circlet] = mainStatKeys
        if (sands) tempmainStatKeys.sands = [sands]
        if (goblet) tempmainStatKeys.goblet = [goblet]
        if (circlet) tempmainStatKeys.circlet = [circlet]
      }
      mainStatKeys = tempmainStatKeys
    }

    if (!optimizationTarget || !Array.isArray(optimizationTarget)) optimizationTarget = undefined
    if (typeof mainStatAssumptionLevel !== "number" || mainStatAssumptionLevel < 0 || mainStatAssumptionLevel > 20)
      mainStatAssumptionLevel = 0
    useExcludedArts = !!useExcludedArts
    useEquippedArts = !!useEquippedArts
    if (!Array.isArray(builds) || !builds.every(b => Array.isArray(b) && b.every(s => typeof s === "string"))) {
      builds = []
      buildDate = 0
    }
    if (!Number.isInteger(buildDate)) buildDate = 0
    if (!maxBuildsToShowList.includes(maxBuildsToShow)) maxBuildsToShow = maxBuildsToShowDefault
    if (typeof plotBase !== "string") plotBase = ""
    if (compareBuild === undefined) compareBuild = false
    if (levelLow === undefined) levelLow = 0
    if (levelHigh === undefined) levelHigh = 20
    buildSettings = { setFilters, statFilters, mainStatKeys, optimizationTarget, mainStatAssumptionLevel, useExcludedArts, useEquippedArts, builds, buildDate, maxBuildsToShow, plotBase, compareBuild, levelLow, levelHigh }
  }

  if (!conditional)
    conditional = {}
  if (!team)
    team = ["", "", ""]

  if (typeof compareData !== "boolean") compareData = false
  if (typeof favorite !== "boolean") favorite = false

  // TODO: validate bonusStats
  if (typeof bonusStats !== "object" || !Object.entries(bonusStats).map(([_, num]) => typeof num === "number")) bonusStats = {}
  if (typeof enemyOverride !== "object" || !Object.entries(enemyOverride).map(([_, num]) => typeof num === "number")) enemyOverride = {}
  const result: ICharacter = {
    key: characterKey, level, ascension, hitMode, reactionMode, conditional,
    bonusStats, enemyOverride, talent, infusionAura, constellation, team,
    compareData, favorite
  }
  if (buildSettings) result.buildSettings = buildSettings
  if (elementKey) result.elementKey = elementKey
  return result
}
/**
 * Returns the closest weapon using current db format, or undefined if it's not recoverable
 *
 * **CAUTION**
 * If the format becomes incompatible with GOODv1, update `good.ts`
 */
export function parseWeapon(obj: any): IWeapon | undefined {
  if (typeof obj !== "object") return

  let { key, level, ascension, refinement, location, lock } = obj
  if (!allWeaponKeys.includes(key)) return
  if (typeof level !== "number" || level < 1 || level > 90) level = 1
  if (typeof ascension !== "number" || ascension < 0 || ascension > 6) ascension = 0
  // TODO: Check if level-ascension matches
  if (typeof refinement !== "number" || refinement < 1 || refinement > 5) refinement = 1
  if (!allCharacterKeys.includes(location)) location = ""

  return { key, level, ascension, refinement, location, lock }
}
