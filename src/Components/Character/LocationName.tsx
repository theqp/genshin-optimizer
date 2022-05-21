import { BusinessCenter } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import CharacterSheet from "../../Data/Characters/CharacterSheet";
import usePromise from "../../ReactHooks/usePromise";
import { identity as id } from "../../Util/Util"

export default function LocationName({ location }) {
  const { t } = useTranslation("ui");
  const characterSheet = usePromise(CharacterSheet.get(location ?? ""), [location])
  return <Typography component="span">
    {characterSheet?.name ? characterSheet.nameWIthIcon : <span><BusinessCenter sx={{ verticalAlign: "text-bottom" }} /> {id<string>(t`inventory`)}</span>}
  </Typography>

}
