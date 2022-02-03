import icons from './icons'
import { Translate } from '../../../Components/Translate'
import ImgIcon from '../../../Components/Image/ImgIcon'
import SqBadge from '../../../Components/SqBadge'
import { sgt } from '../../Characters/SheetUtil'
import { absorbableEle } from '../../Characters/dataUtil'
import ColorText from '../../../Components/ColoredText'
import { ArtifactSheet, IArtifactSheet } from '../ArtifactSheet'
import { ArtifactSetKey } from '../../../Types/consts'
import { dataObjForArtifactSheet } from '../dataUtil'
import { Data } from '../../../Formula/type'
import { customStringRead, infoMut, match, percent, threshold_add } from '../../../Formula/utils'
import { input } from '../../../Formula'
import { st } from '../../Characters/SheetUtil_WR'
import elementalData from '../../ElementalData'

const key: ArtifactSetKey = "ViridescentVenerer"
const tr = (strKey: string) => <Translate ns={`artifact_${key}_gen`} key18={strKey} />

const set2 = threshold_add(input.artSet.ViridescentVenerer, 2, percent(0.15))

const set4 = threshold_add(input.artSet.ViridescentVenerer, 4, percent(0.6))

const condSwirlPaths = Object.fromEntries(absorbableEle.map(e => [e, [key, `swirl${e}`]]))
const condSwirls = Object.fromEntries(absorbableEle.map(e => [e, customStringRead(["conditional", ...condSwirlPaths[e]])]))

const condSwirlNodes = Object.fromEntries(absorbableEle.map(e => [e,
  threshold_add(input.artSet.ViridescentVenerer, 4,
    match("swirl", condSwirls[e], percent(-0.4))
  )]))

const data: Data = dataObjForArtifactSheet(key, {
  premod: {
    anemo_dmg_: set2,
    dmgBonus: { swirl: set4, },
  },
  enemy: {
    res: condSwirlNodes
  }
})

const sheet: IArtifactSheet = {
  name: "Viridescent Venerer", rarity: [4, 5], icons,
  setEffects: {
    2: {
      document: [{
        fields: [{
          node: infoMut(set2, { key: "anemo_dmg_" })
        }]
      }]
    },
    4: {
      document: [{
        fields: [{
          node: infoMut(set4, { key: "swirl_dmg_" })
        }],
      },
      ...absorbableEle.map(eleKey => ({
        conditional: { // Poetics of Fuubutsu
          value: condSwirls[eleKey],
          path: condSwirlPaths[eleKey],
          header: {
            title: tr("setName"),
            icon: <ImgIcon size={2} sx={{ m: -1 }} src={icons.flower} />,
            action: <SqBadge color="success">4-set</SqBadge>
          },
          description: tr(`setEffects.4`),
          name: st("eleSwirled"),
          states: {
            swirl: {
              name: <ColorText color={eleKey}>{elementalData[eleKey].name}</ColorText>,
              fields: [{
                node: infoMut(condSwirlNodes[eleKey], { key: `${eleKey}_enemyRes_` })
              }, {
                text: sgt("duration"),
                value: 10,
                unit: "s"
              }]
            }
          }
        },
      }))
      ]
    }
  }
}
export default new ArtifactSheet(key, sheet, data)
