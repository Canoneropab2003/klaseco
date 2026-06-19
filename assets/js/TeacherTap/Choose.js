document.addEventListener("DOMContentLoaded", () => {
  const roomScreen        = document.getElementById("room-select-screen");
  const roomCards         = document.querySelectorAll(".room-card");
  const attendanceWrapper = document.querySelector(".attendance-wrapper");
  const roomLabel         = document.getElementById("selected-room-label");
  
  // ADDED: Target the "Change Room" back button
  const btnBackToRoom     = document.getElementById("btn-back-to-room");

  // Make sure attendance is hidden first
  if (attendanceWrapper) {
    attendanceWrapper.classList.add("hidden-attendance");
  }

  roomCards.forEach(card => {
    card.addEventListener("click", () => {
      const room = card.getAttribute("data-room") || "---";

      // Show room in header label
      if (roomLabel) {
        roomLabel.textContent = room;
      }

      // Expose globally if you need in MainFunctions.js / Supabase
      window.CURRENT_ROOM_CODE = room;

      // Hide first container, show attendance UI
      if (roomScreen) roomScreen.style.display = "none";
      if (attendanceWrapper) attendanceWrapper.classList.remove("hidden-attendance");
    });
  });

  // ADDED: Logic to handle going back to the room selection screen
  if (btnBackToRoom) {
    btnBackToRoom.addEventListener("click", () => {
      // 1. Hide the attendance screen again
      if (attendanceWrapper) {
        attendanceWrapper.classList.add("hidden-attendance");
      }
      
      // 2. Show the room selection screen
      if (roomScreen) {
        roomScreen.style.display = ""; // <-- Leave it empty!
      }
      
      // 3. (Optional but recommended) Clear the global room code so it doesn't log attendance to the wrong room while idle
      window.CURRENT_ROOM_CODE = null;
    });
  }
});