function passsubmit() {
    let password = document.getElementById("password").value;
    if (password === "LASER") {
        window.location.href = "/all files/scenes/gamez.html";
        document.getElementById("after").style.display = "none";
        document.getElementById("text").style.display = "none";
    } else {
        document.getElementById("text").style.display = "none";
        document.getElementById("after").style.display = "block";
        alert("Thankyou for responding. we will get back to you soon.");
    }
}
