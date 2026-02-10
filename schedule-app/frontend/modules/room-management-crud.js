/**************************************************************
 * ROOM MANAGEMENT CRUD
 **************************************************************/
// btnManageRooms, modalManageRooms, tableRoomsBody are defined in 03-global-variables-for-room-view-columns.js
// btnAddRoom is defined in 03-global-variables-for-room-view-columns.js
// modalAddRoom is defined in 03-global-variables-for-room-view-columns.js
// btnSaveRoom is defined in 03-global-variables-for-room-view-columns.js
const roomIdInput = document.getElementById("room-id");
const roomNameInput = document.getElementById("room-name");
const btnDeleteAllRooms = document.getElementById("btn-delete-all-rooms");

// Seed predefined rooms into the database once (only on first use)
async function seedPredefinedRooms() {
  if (localStorage.getItem('predefinedRoomsSeeded')) return;
  const existingRooms = await apiGet("rooms");
  const existingNames = existingRooms.map(r => r.name.toLowerCase());
  for (const roomName of predefinedRooms) {
    if (!existingNames.includes(roomName.toLowerCase())) {
      try {
        await apiPost("rooms", { name: roomName });
      } catch (e) {
        console.log(`Room ${roomName} may already exist.`);
      }
    }
  }
  localStorage.setItem('predefinedRoomsSeeded', 'true');
}

btnManageRooms.addEventListener("click", async () => {
  await seedPredefinedRooms();
  await renderRoomsTable();
  showModal(modalManageRooms);
});

async function renderRoomsTable() {
  const roomsList = await apiGet("rooms");
  tableRoomsBody.innerHTML = "";
  if (roomsList.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" style="text-align:center; color:#888; padding:20px;">No rooms found. Click "Add New Room" to get started.</td>`;
    tableRoomsBody.appendChild(tr);
    return;
  }
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
  const hasSchedules = schedules.some(sch => sch.roomId == id);
  
  let confirmMsg = "Are you sure you want to delete this room?";
  if (hasSchedules) {
    confirmMsg = "This room has schedules assigned to it. Deleting this room will also remove all its associated schedules.\n\nAre you sure you want to continue?";
  }
  if (!confirm(confirmMsg)) return;
  
  await apiDelete("rooms", id);
  await renderRoomsTable();
  await renderRoomViewTables();
  await forceValidateAllComplementary();
};

// Delete All Rooms
btnDeleteAllRooms.addEventListener("click", async () => {
  const roomsList = await apiGet("rooms");
  if (roomsList.length === 0) {
    alert("No rooms to delete.");
    return;
  }

  const schedules = await apiGet("schedules");
  const roomsWithSchedules = roomsList.filter(room => schedules.some(s => s.roomId == room.id));

  let confirmMsg = `Are you sure you want to delete all ${roomsList.length} room(s)?`;
  if (roomsWithSchedules.length > 0) {
    confirmMsg = `${roomsWithSchedules.length} out of ${roomsList.length} room(s) have schedules assigned. Deleting all rooms will also remove all associated schedules.\n\nAre you sure you want to continue?`;
  }
  if (!confirm(confirmMsg)) return;

  for (const room of roomsList) {
    await apiDelete("rooms", room.id);
  }
  await renderRoomsTable();
  await renderRoomViewTables();
  await forceValidateAllComplementary();
});


