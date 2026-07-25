const input = document.getElementById("item-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("shopping-list");

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text === "") return;

  const li = document.createElement("li");
  li.textContent = text;

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "x";
  removeBtn.addEventListener("click", () => li.remove());

  li.appendChild(removeBtn);
  list.appendChild(li);
  input.value = "";
});
