document.addEventListener('DOMContentLoaded', () => {
  const roomId = window.location.pathname.split("/").filter(Boolean).pop();
  const socket = io({ query: { roomId } });

  const playButton = document.getElementById("play");

  socket.on("connect", () => console.log("Connected:", socket.id));
  socket.on("redirect", ({ url }) => window.location.href = url);

  playButton.onclick = () => {
    socket.emit("play_button_clicked");
    setTimeout(() => window.location.href = `/play/${roomId}`, 150);
  };
});
