import { CardContent, Divider, Typography } from '@mui/material'
import ReactGA from 'react-ga'
import { Trans, useTranslation } from "react-i18next"
import CardDark from '../Components/Card/CardDark'
import DownloadCard from './DownloadCard'
import LanguageCard from './LanguageCard'
import TCToggleCard from './TCToggleCard'
import UploadCard from './UploadCard'

export default function PageSettings() {
  const { t } = useTranslation(["settings"]);
  ReactGA.pageview('/setting')

  return <CardDark sx={{ my: 1 }}>
    <CardContent sx={{ py: 1 }}>
      <Typography variant="subtitle1">
        <Trans t={t} i18nKey="title" />
      </Typography>
    </CardContent>
    <Divider />
    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <LanguageCard />
      <DownloadCard />
      <UploadCard />
      <TCToggleCard />
    </CardContent>
  </CardDark>
}
