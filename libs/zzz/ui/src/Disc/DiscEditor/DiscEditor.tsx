import {
  CardThemed,
  DropdownButton,
  ModalWrapper,
} from '@genshin-optimizer/common/ui'
import {
  range,
  statKeyToFixed,
  toPercent,
} from '@genshin-optimizer/common/util'
import type { DiscSetKey, DiscSlotKey } from '@genshin-optimizer/zzz/consts'
import {
  allDiscSlotKeys,
  discMaxLevel,
  getDiscMainStatVal,
} from '@genshin-optimizer/zzz/consts'
import type { IDisc } from '@genshin-optimizer/zzz/db'
import {
  validateDisc,
  type ICachedDisc,
  type ICachedSubstat,
  type ISubstat,
} from '@genshin-optimizer/zzz/db'
import { useDatabaseContext } from '@genshin-optimizer/zzz/db-ui'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ReplayIcon from '@mui/icons-material/Replay'
import UpdateIcon from '@mui/icons-material/Update'
import {
  Box,
  Button,
  ButtonGroup,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { MouseEvent } from 'react'
import { Suspense, useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { DiscCard } from '../DiscCard'
import { DiscMainStatDropdown } from '../DiscMainStatDropdown'
import { DiscRarityDropdown } from '../DiscRarityDropdown'
import { DiscSetAutocomplete } from '../DiscSetAutocomplete'
import SubstatInput from './SubstatInput'
interface DiscReducerState {
  disc: Partial<ICachedDisc>
  validatedDisc?: IDisc
}
function reducer(state: DiscReducerState, action: Partial<ICachedDisc>) {
  const disc = { ...state.disc, ...action }
  const validatedDisc = validateDisc(disc)

  return {
    // Combine because validatedDisc:IDisc is missing the `id` field in ICachedDisc
    disc: { ...disc, ...(validatedDisc || {}) } as Partial<ICachedDisc>,
    validatedDisc,
  }
}
function useDiscValidation(discFromProp: Partial<ICachedDisc>) {
  const [{ disc, validatedDisc }, setDisc] = useReducer(reducer, {
    disc: discFromProp,
    validatedDisc: undefined,
  })
  useEffect(() => setDisc(discFromProp), [discFromProp])

  return { disc, validatedDisc, setDisc }
}

export function DiscEditor({
  disc: discFromProp,
  show,
  onClose,
  fixedSlotKey,
  allowEmpty = false,
  disableSet = false,
}: {
  disc: Partial<ICachedDisc>
  show: boolean
  onClose: () => void
  allowEmpty?: boolean
  disableSet?: boolean
  fixedSlotKey?: DiscSlotKey
}) {
  const { t } = useTranslation('disc')
  const { t: tk } = useTranslation(['discs_gen', 'statKey_gen'])

  const { database } = useDatabaseContext()
  const { disc, validatedDisc, setDisc } = useDiscValidation(discFromProp)
  const {
    prev,
    prevEditType,
  }: {
    prev: ICachedDisc | undefined
    prevEditType: 'edit' | 'duplicate' | 'upgrade' | ''
  } = useMemo(() => {
    if (!disc) return { prev: undefined, prevEditType: '' }
    const dbDisc = disc?.id && database.discs.get(disc?.id)
    if (dbDisc) return { prev: dbDisc, prevEditType: 'edit' }
    if (disc === undefined) return { prev: undefined, prevEditType: '' }
    const { duplicated, upgraded } = database.discs.findDups(
      disc as ICachedDisc
    )
    return {
      prev: duplicated[0] ?? upgraded[0],
      prevEditType: duplicated.length !== 0 ? 'duplicate' : 'upgrade',
    }
  }, [disc, database])

  const disableEditSlot =
    (!disc.id && !!disc?.location) || // Disable slot for equipped disc
    !!fixedSlotKey // Disable slot if its fixed

  const { rarity = 'S', level = 0 } = disc ?? {}
  const slotKey = useMemo(() => {
    return disc?.slotKey ?? fixedSlotKey ?? '1'
  }, [fixedSlotKey, disc])

  const reset = useCallback(() => {
    setDisc({})
    if (!allowEmpty) onClose()
  }, [allowEmpty, onClose, setDisc])

  const setSubstat = useCallback(
    (index: number, substat?: ISubstat) => {
      const substats = [...(disc.substats || [])]
      if (substat) substats[index] = substat as ICachedSubstat
      else substats.filter((_, i) => i !== index)
      setDisc({ substats })
    },
    [disc, setDisc]
  )
  const onCloseModal = useCallback(
    (e: MouseEvent) => {
      if (
        (disc.id || Object.keys(disc).length > 0) &&
        !window.confirm(t('editor.clearPrompt') as string)
      ) {
        e?.preventDefault()
        return
      }
      onClose()
      reset()
    },
    [t, disc, onClose, reset]
  )

  const theme = useTheme()
  const grmd = useMediaQuery(theme.breakpoints.up('md'))
  const removeId = disc?.id || prev?.id
  const canClearDisc = (): boolean =>
    window.confirm(t('editor.clearPrompt') as string)

  return (
    <Suspense fallback={false}>
      <ModalWrapper open={show} onClose={onCloseModal}>
        <CardThemed bgt="dark">
          <CardHeader
            title="Disc Editor"
            action={
              <IconButton onClick={onCloseModal}>
                <CloseIcon />
              </IconButton>
            }
          />
          <CardContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          >
            <Grid container spacing={1} columns={{ xs: 1, md: 2 }}>
              {/* left column */}
              <Grid item xs={1} display="flex" flexDirection="column" gap={1}>
                {/* set */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <DiscSetAutocomplete
                    disabled={disableSet}
                    size="small"
                    discSetKey={disc?.setKey ?? ''}
                    setDiscSetKey={(key) =>
                      setDisc({ setKey: key as DiscSetKey })
                    }
                    sx={{ flexGrow: 1 }}
                    label={disc?.setKey ? '' : t('editor.unknownSetName')}
                  />
                  <DiscRarityDropdown
                    rarity={disc ? rarity : undefined}
                    onRarityChange={(rarity) => setDisc({ rarity })}
                    disabled={!disc.mainStatKey}
                  />
                </Box>

                {/* level */}
                <Box component="div" display="flex">
                  <TextField
                    label="Level"
                    variant="filled"
                    sx={{ flexShrink: 1, flexGrow: 1, mr: 1, my: 0 }}
                    margin="dense"
                    size="small"
                    value={level}
                    disabled={!disc.rarity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      setDisc({ level: value })
                    }}
                  />
                  <ButtonGroup>
                    <Button
                      onClick={() => setDisc({ level: level - 1 })}
                      disabled={!disc.rarity || level === 0}
                    >
                      -
                    </Button>
                    {rarity
                      ? range(0, discMaxLevel[rarity] / 3)
                          .map((i) => 3 * i)
                          .map((i) => (
                            <Button
                              key={i}
                              onClick={() => setDisc({ level: i })}
                              disabled={!disc.rarity || level === i}
                            >
                              {i}
                            </Button>
                          ))
                      : null}
                    <Button
                      onClick={() => setDisc({ level: level + 1 })}
                      disabled={!disc.rarity || level === discMaxLevel[rarity]}
                    >
                      +
                    </Button>
                  </ButtonGroup>
                </Box>

                {/* slot */}
                <Box component="div" display="flex">
                  <DropdownButton
                    // startIcon={
                    //   disc?.slotKey ? (
                    //     <SlotIcon slotKey={disc.slotKey} />
                    //   ) : undefined
                    // }
                    title={disc?.slotKey ? tk(disc.slotKey) : t('slot')}
                    value={slotKey}
                    disabled={disableEditSlot}
                    color={disc ? 'success' : 'primary'}
                  >
                    {allDiscSlotKeys.map((sk) => (
                      <MenuItem
                        key={sk}
                        selected={slotKey === sk}
                        disabled={slotKey === sk}
                        onClick={() => setDisc({ slotKey: sk })}
                      >
                        {/* <ListItemIcon>
                          <SlotIcon slotKey={sk} />
                        </ListItemIcon> */}
                        {tk(sk)}
                      </MenuItem>
                    ))}
                  </DropdownButton>
                  <CardThemed bgt="light" sx={{ p: 1, ml: 1, flexGrow: 1 }}>
                    <Suspense fallback={<Skeleton width="60%" />}>
                      <Typography color="text.secondary">
                        {tk(`discs_gen:${slotKey}`)}
                      </Typography>
                    </Suspense>
                  </CardThemed>
                </Box>

                {/* main stat */}
                <Box component="div" display="flex" gap={1}>
                  <DiscMainStatDropdown
                    slotKey={slotKey}
                    statKey={disc?.mainStatKey}
                    setStatKey={(mainStatKey) => setDisc({ mainStatKey })}
                    defText={t('mainStat')}
                    dropdownButtonProps={{
                      color: disc ? 'success' : 'primary',
                    }}
                  />
                  <CardThemed bgt="light" sx={{ p: 1, flexGrow: 1 }}>
                    <Typography color="text.secondary">
                      {disc?.mainStatKey
                        ? toPercent(
                            getDiscMainStatVal(rarity, disc.mainStatKey, level),
                            disc.mainStatKey
                          ).toFixed(statKeyToFixed(disc.mainStatKey))
                        : t('mainStat')}
                    </Typography>
                  </CardThemed>
                  <Button
                    onClick={() => setDisc({ lock: !disc?.lock })}
                    color={disc?.lock ? 'success' : 'primary'}
                    disabled={!disc}
                  >
                    {disc?.lock ? <LockIcon /> : <LockOpenIcon />}
                  </Button>
                </Box>
                {/* <LocationAutocomplete
                  locKey={cDisc?.location ?? ''}
                  setLocKey={(charKey) => setDisc({ location: charKey })}
                /> */}
              </Grid>

              {/* right column */}
              <Grid item xs={1} display="flex" flexDirection="column" gap={1}>
                {/* substat selections */}
                {[0, 1, 2, 3].map((index) => (
                  <SubstatInput
                    key={index}
                    index={index}
                    disc={disc}
                    setSubstat={setSubstat}
                  />
                ))}
              </Grid>
            </Grid>

            {/* Duplicate/Updated/Edit UI */}
            {prev && (
              <Grid
                container
                sx={{ justifyContent: 'space-around' }}
                spacing={1}
              >
                <Grid item xs={12} md={5.5} lg={4}>
                  <CardThemed bgt="light">
                    <Typography
                      sx={{ textAlign: 'center' }}
                      py={1}
                      variant="h6"
                      color="text.secondary"
                    >
                      {prevEditType !== 'edit'
                        ? prevEditType === 'duplicate'
                          ? t('editor.dupeDisc')
                          : t('editor.updateDisc')
                        : t('editor.beforeEdit')}
                    </Typography>
                    <DiscCard disc={prev} />
                  </CardThemed>
                </Grid>
                {grmd && (
                  <Grid
                    item
                    md={1}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <CardThemed bgt="light" sx={{ display: 'flex' }}>
                      <ChevronRightIcon sx={{ fontSize: 40 }} />
                    </CardThemed>
                  </Grid>
                )}
                <Grid item xs={12} md={5.5} lg={4}>
                  <CardThemed bgt="light">
                    <Typography
                      sx={{ textAlign: 'center' }}
                      py={1}
                      variant="h6"
                      color="text.secondary"
                    >
                      {t('editor.preview')}
                    </Typography>
                    {validatedDisc && <DiscCard disc={validatedDisc} />}
                  </CardThemed>
                </Grid>
              </Grid>
            )}

            {/* Buttons */}
            <Box display="flex" gap={2}>
              {prevEditType === 'edit' && prev?.id ? (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    disc && database.discs.set(prev.id, disc)
                    reset()
                  }}
                  disabled={!validatedDisc}
                  color="primary"
                >
                  {t('editor.btnSave')}
                </Button>
              ) : (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (!validatedDisc) return
                    database.discs.new(validatedDisc)
                    reset()
                  }}
                  disabled={!validatedDisc}
                  color={prevEditType === 'duplicate' ? 'warning' : 'primary'}
                >
                  {t('editor.btnAdd')}
                </Button>
              )}
              {allowEmpty && (
                <Button
                  startIcon={<ReplayIcon />}
                  disabled={!disc}
                  onClick={() => {
                    canClearDisc() && reset()
                  }}
                  color="error"
                >
                  {t('editor.btnClear')}
                </Button>
              )}
              {prev && prevEditType !== 'edit' && (
                <Button
                  startIcon={<UpdateIcon />}
                  onClick={() => {
                    if (!validatedDisc) return
                    database.discs.set(prev.id, validatedDisc)
                    reset()
                  }}
                  disabled={!validatedDisc}
                  color="success"
                >
                  {t('editor.btnUpdate')}
                </Button>
              )}
              {!!removeId && (
                <Button
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => {
                    if (!window.confirm(t('editor.confirmDelete'))) return
                    database.discs.remove(removeId)
                    reset()
                  }}
                  disabled={!removeId}
                  color="error"
                >
                  {t('editor.delete')}
                </Button>
              )}
            </Box>
          </CardContent>
        </CardThemed>
      </ModalWrapper>
    </Suspense>
  )
}
