// assets/js/TeacherTap/Loader.js

// Using 'DOMContentLoaded' instead of 'load' makes it start much faster
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById('loading-overlay');
  
  if (loader) {
    // Show the loader immediately (if not already handled by CSS)
    loader.style.opacity = "1";
    loader.style.visibility = "visible";

    // Start your 5-second countdown
    setTimeout(() => {
      loader.classList.add('fade-out');
      
      setTimeout(() => {
        loader.style.display = 'none';
      }, 600);
      
    }, 5000); 
  }
});