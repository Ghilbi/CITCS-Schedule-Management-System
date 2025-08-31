/**************************************************************
 * ROOM MANAGEMENT CRUD
 **************************************************************/
// btnManageRooms, modalManageRooms, tableRoomsBody are defined in 03-global-variables-for-room-view-columns.js
// btnAddRoom is defined in 03-global-variables-for-room-view-columns.js
// modalAddRoom is defined in 03-global-variables-for-room-view-columns.js
// btnSaveRoom is defined in 03-global-variables-for-room-view-columns.js
const roomIdInput = document.getElementById("room-id");
const roomNameInput = document.getElementById("room-name");

btnManageRooms.addEventListener("click", async () => {
  await renderRoomsTable();
  showModal(modalManageRooms);
});

async function renderRoomsTable() {
  const roomsList = await apiGet("rooms");
  tableRoomsBody.innerHTML = "";
  roomsList.forEach(room => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${room.id}</td>
      <td>${room.name}</td>
      <td>
        <div class="action-buttons-container">
          <button class="action-edit-btn" onclick="editRoom(${room.id})">Edit</button>
          <button class="action-delete-btn" onclick="deleteRoom(${room.id})">Delete</button>
        </div>
      </td>
    `;
    tableRoomsBody.appendChild(tr);
  });
}

btnAddRoom.addEventListener("click", () => {
  roomIdInput.value = "";
  roomNameInput.value = "";
  document.getElementById("modal-room-title").textContent = "Add New Room";
  showModal(modalAddRoom);
});

btnSaveRoom.addEventListener("click", async () => {
  try {
    const id = roomIdInput.value;
    const name = roomNameInput.value.trim();
    if (!name) {
      alert("Please enter a room name.");
      return;
    }
    const rooms = await apiGet("rooms");
    // Make case insensitive comparison for room names
    const existingRoom = rooms.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id != id);
    if (existingRoom) {
      alert("This room name already exists.");
      return;
    }
    
    // Check if room name contains any special characters
    if (/[^a-zA-Z0-9]/.test(name)) {
      alert("Room name should only contain letters and numbers.");
      return;
    }
    
    if (id) {
      await apiPut("rooms", id, { name });
    } else {
      await apiPost("rooms", { name });
    }
    hideModal(modalAddRoom);
    await renderRoomsTable();
    await renderRoomViewTables();
    await forceValidateAllComplementary();
  } catch (error) {
    console.error("Error saving room:", error);
    alert("Failed to save the room. Please try again.");
  }
});

window.editRoom = async function(id) {
  const roomsList = await apiGet("rooms");
  const room = roomsList.find(r => r.id == id);
  if (!room) return;
  roomIdInput.value = room.id;
  roomNameInput.value = room.name;
  document.getElementById("modal-room-title").textContent = "Edit Room";
  showModal(modalAddRoom);
};

window.deleteRoom = async function(id) {
  const schedules = await apiGet("schedules");
  if (schedules.some(sch => sch.roomId == id)) {
    alert("Cannot delete this room because it is currently scheduled.");
    return;
  }
  if (!confirm("Are you sure you want to delete this room?")) return;
  await apiDelete("rooms", id);
  await renderRoomsTable();
  await renderRoomViewTables();
  await forceValidateAllComplementary();
};

/**************************************************************
 * SECTION VIEW FUNCTIONALITY (Existing)
 **************************************************************/
// Removed View Sections functionality

