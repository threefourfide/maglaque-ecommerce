import { useNavigate } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

export default function OrderUpdateToast({ notice, onClose }) {
  const navigate = useNavigate();

  const close = (event, reason) => {
    if (reason === "clickaway") return;
    onClose();
  };

  return (
    <Snackbar
      key={notice?.id}
      open={!!notice}
      autoHideDuration={8000}
      onClose={close}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ zIndex: 2000, mt: 8 }}
    >
      <Alert
        onClose={close}
        severity={notice?.severity || "success"}
        variant="filled"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              onClose();
              navigate("/account", { state: { tab: "purchase" } });
            }}
          >
            View
          </Button>
        }
        sx={{ width: "100%", maxWidth: 480, borderRadius: 0, alignItems: "center" }}
      >
        {notice?.message}
      </Alert>
    </Snackbar>
  );
}
