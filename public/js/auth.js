// Function to handle user logout
function logout() {
    // Remove JWT token from local storage
    localStorage.removeItem('jwtToken');
    console.log('JWT token removed from local storage.');

    // Clear any relevant cache (placeholder)
    // For example, if using a service worker: caches.delete('my-cache');
    console.log('Cache cleared (placeholder).');

    // Redirect to the login page
    // Replace '/login' with the actual path to your login page
    window.location.href = '/login';
    console.log('Redirecting to login page.');
}

// Example usage (you would call this function when the logout button is clicked)
// document.getElementById('logout-button').addEventListener('click', logout);
