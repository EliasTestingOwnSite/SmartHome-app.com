const input = document.getElementById("item-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("shopping-list");

const itemsRef = db.collection("shoppingList");

// Listen for live updates from the database
itemsRef.orderBy("createdAt").onSnapshot((snapshot) => {
  list.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = data.text;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => {
      itemsRef.doc(doc.id).delete();
    });

    li.appendChild(removeBtn);
    list.appendChild(li);
  });
});

addBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text === "") return;

  itemsRef.add({
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
});
