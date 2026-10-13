import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

export default function LogoutDialog({ open, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0, backgroundColor: "#F9F6F0" } }}>
      <DialogTitle sx={{ fontFamily: "inherit", letterSpacing: "0.1em", color: "#2D3831" }}>Log out?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontFamily: "inherit", color: "rgba(45,56,49,0.8)" }}>
          Are you sure you want to log out?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ color: "#2D3831", borderRadius: 0 }}>
          Stay signed in
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disableElevation
          sx={{ backgroundColor: "#2D3831", borderRadius: 0, "&:hover": { backgroundColor: "#2D3A31" } }}
        >
          Log out
        </Button>
      </DialogActions>
    </Dialog>
  );
}
