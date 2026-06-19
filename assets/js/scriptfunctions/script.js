document.getElementById('loginButton').addEventListener('click', function () {
  const button = this;
  button.classList.add('loading');
  button.disabled = true;

  // Redirect after 2 seconds
  setTimeout(() => {
    /* CHANGE: window.location.replace() 
       This replaces the landing page in the browser history. 
       If the user clicks "Back" from login.php, they go to the 
       site they were on BEFORE Klaseco, which is what users expect.
    */
    window.location.replace("login.php"); 
  }, 2000);
});

/* ADD THIS: The "Back Button" Failsafe
   If the user does return to this page (via back button), 
   this ensures the button isn't stuck in a "loading" state.
*/
window.addEventListener('pageshow', function (event) {
  const button = document.getElementById('loginButton');
  if (button) {
    button.classList.remove('loading');
    button.disabled = false;
  }
});