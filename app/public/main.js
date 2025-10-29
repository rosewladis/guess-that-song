let creat_button = document.getElementById("create");
let play_button = document.getElementById("play");

creat_button.addEventListener("click", () => {
    let p = document.createElement("p");
    p.textContent = "Create button clicked!";
    document.body.appendChild(p);
});

play_button.addEventListener("click", () => {
    
});