// === UI Toggle & Theme ===
const sideMenu = document.querySelector("aside");
const profileBtn = document.querySelector("#profile-btn");
const themeToggler = document.querySelector(".theme-toggler");
const nextDay = document.getElementById('nextDay');
const prevDay = document.getElementById('prevDay');
const lightModeIcon = themeToggler.querySelector('span:nth-child(1)');
const darkModeIcon = themeToggler.querySelector('span:nth-child(2)');

// Toggle sidebar
profileBtn.onclick = function () {
  sideMenu.classList.toggle('active');
};



// On page load: Apply saved theme
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    lightModeIcon.classList.remove("active");
    darkModeIcon.classList.add("active");
  } else {
    document.body.classList.remove("dark-theme");
    lightModeIcon.classList.add("active");
    darkModeIcon.classList.remove("active");
  }
});

// Theme toggler logic
themeToggler.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');

  // Toggle icons
  lightModeIcon.classList.toggle('active', !isDark);
  darkModeIcon.classList.toggle('active', isDark);

  // Save to localStorage
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});


window.onscroll = () => {
  sideMenu.classList.remove('active');
  document.querySelector('header').classList.toggle('active', window.scrollY > 0);
};

// === Global Variables ===
const backendUrl = "https://iareattendancemgmt.onrender.com";

// === Faculty UI Renderer ===
function updateFacultyUI(faculty) {
  document.getElementById("facultyName").textContent = faculty.name || "N/A";
  document.getElementById("facultyID").textContent = faculty.facultyid || "N/A";
  document.getElementById("facultyEmail").textContent = faculty.email || "N/A";

  const batchContainer = document.getElementById("facultyBatch");
  batchContainer.innerHTML = "";

  if (faculty.batches_assigned?.length) {
    faculty.batches_assigned.forEach(batch => {
      const li = document.createElement("li");
      li.textContent = batch;
      batchContainer.appendChild(li);
    });
  } else {
    batchContainer.innerHTML = "<li>N/A</li>";
  }
}

// === Logout Function ===
function logout() {
  localStorage.clear();
  window.location.href = '/';
}

// === Faculty Data Fetch & Initialization ===
document.addEventListener("DOMContentLoaded", () => {
  const facultyid = localStorage.getItem("facultyid");
  if (!facultyid) {
    window.location.href = "/";
    return;
  }
  const rawData = localStorage.getItem("facultyData");
  if (!rawData) return;

  try {
    const faculty = JSON.parse(rawData);
    updateFacultyUI(faculty);

    const cacheTime = localStorage.getItem("facultyDataTimestamp");
    const isCacheFresh = cacheTime && Date.now() - parseInt(cacheTime) < 3600000;

    if (isCacheFresh) {
      console.log("Using cached faculty data.");
    }

    renderFacultyTimetable();
  } catch (err) {
    console.error("Invalid faculty data in localStorage:", err);
    // localStorage.removeItem("facultyData");
    localStorage.removeItem("facultyDataTimestamp");
  }
});




// Time-Table_Section

const batchWiseTimetable = {
  "SKILLUP BATCH-1": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5102" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5102" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "DBMS", room: "5102" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5102" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "AWS", room: "5102" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "JSF", room: "5102" }
    ]
  },
  "SKILLUP BATCH-2": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "AWS", room: "5106" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5106" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5106" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5106" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5106" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5106" }
    ]
  },
  "SKILLUP BATCH-3": {
    Monday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5104" }
    ],
    Tuesday: [
      { time: "1:15PM - 3:50PM", subject: "AWS", room: "5104" }
    ],
    Wednesday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5104" }
    ],
    Thursday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5104" }
    ],
    Friday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5104" }
    ],
    Saturday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5104" }
    ]
  },
  "SKILLNEXT BATCH-1": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5204" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "DBMS", room: "5204" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5204" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5204" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5204" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5204" }
    ]
  },
  "SKILLNEXT BATCH-2": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5104" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5104" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5104" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5104" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5104" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5104" }
    ]
  },
  "SKILLNEXT BATCH-3": {
    Monday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5102" }
    ],
    Tuesday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5102" }
    ],
    Wednesday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5102" }
    ],
    Thursday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5102" }
    ],
    Friday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5102" }
    ],
    Saturday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5102" }
    ]
  },
  "SKILLBRIDGE BATCH-1": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5101" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5101" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5101" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5101" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5101" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5101" }
    ]
  },
  "SKILLBRIDGE BATCH-2": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5005" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "DBMS", room: "5005" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5005" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5005" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5005" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5005" }
    ]
  },
  "SKILLBRIDGE BATCH-3": {
    Monday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5201" }
    ],
    Tuesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5201" }
    ],
    Wednesday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5201" }
    ],
    Thursday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5201" }
    ],
    Friday: [
      { time: "1:15PM - 3:50PM", subject: "DBMS", room: "5201" }
    ],
    Saturday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5201" }
    ]
  },
  "SKILLBRIDGE BATCH-4": {
    Monday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5101" }
    ],
    Tuesday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5101" }
    ],
    Wednesday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5101" }
    ],
    Thursday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5101" }
    ],
    Friday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5101" }
    ],
    Saturday: [
      { time: "9:30AM - 12:15PM", subject: "DBMS", room: "5101" }
    ]
  },
  "SKILLBRIDGE BATCH-5": {
    Monday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5106" }
    ],
    Tuesday: [
      { time: "1:15PM - 3:50PM", subject: "CP", room: "5106" }
    ],
    Wednesday: [
      { time: "1:15PM - 3:50PM", subject: "JFS", room: "5106" }
    ],
    Thursday: [
      { time: "9:30AM - 12:15PM", subject: "CP", room: "5106" }
    ],
    Friday: [
      { time: "9:30AM - 12:15PM", subject: "DBMS", room: "5106" }
    ],
    Saturday: [
      { time: "9:30AM - 12:15PM", subject: "JFS", room: "5106" }
    ]
  }

};

function renderFacultyTimetable() {
  const container = document.getElementById("timetableContainer");
  const raw = localStorage.getItem("facultyData");
  if (!raw) return;

  let faculty;
  try {
    faculty = JSON.parse(raw);
  } catch {
    console.error("Invalid faculty data.");
    return;
  }

  const assignedBatches = faculty.batches_assigned || [];
  if (!assignedBatches.length) {
    container.innerHTML = "<p class='no-classes'>🎉 No batches assigned.</p>";
    return;
  }

  const batchSubjectFacultyMap = {
    // SKILLUP-1
    "SKILLUP BATCH-1_CP": "Dr. B. Padmaja || Dr. B Ravi Kumar",
    "SKILLUP BATCH-1_JFS": "Mr. I N V Surya Narayana || Dr. M Madhusudhan Reddy",
    "SKILLUP BATCH-1_DBMS": "Mr. B Ramesh || Mr. P V Narsimha Rao",
    "SKILLUP BATCH-1_AWS": "Dr. C.V. Rama Padmaja || Dr. B Ravi Kumar",

    // SKILLUP-2
    "SKILLUP BATCH-2_CP": "Dr. B. Padmaja || Dr B Surekha Reddy",
    "SKILLUP BATCH-2_JFS": "Mr. E Krishna Rao Patro || Dr. K. Viswanath Allamraju",
    "SKILLUP BATCH-2_DBMS": "Ms. K Mayuri || Mr. P V Narsimha Rao",
    "SKILLUP BATCH-2_AWS": "Dr. C.V. Rama Padmaja || Dr B Surekha Reddy",

    // SKILLUP-3 
    "SKILLUP BATCH-3_CP": "Dr. V Maheshwar Reddy || Ms. G Ajitha",
    "SKILLUP BATCH-3_JFS": "Mr. I N V Surya Narayana || Mr. B Ramesh",
    "SKILLUP BATCH-3_DBMS": "Mr. B Ramesh || Mr. P V Narsimha Rao ",
    "SKILLUP BATCH-3_AWS": "Dr. C V R Padmaja || Ms. G Ajitha",

    // SKILLNEXT-1
    "SKILLNEXT BATCH-1_CP": "Dr. V Maheshwar Reddy || Dr. D Khalandar Basha ",
    "SKILLNEXT BATCH-1_JFS": "Mr. E Krishna Rao Patro  || Dr. A Naresh Kumar ",
    "SKILLNEXT BATCH-1_DBMS": "Ms. K Mayuri  || Mr. P V Narsimha Rao ",
    
    // SKILLNEXT-2
    "SKILLNEXT BATCH-2_CP": "Dr. C V R Padmaja || Mr. A Srikanth ",
    "SKILLNEXT BATCH-2_JFS": "Mr. E Krishna Rao Patro  || Mr. A Somaiah ",
    "SKILLNEXT BATCH-2_DBMS": "Ms. K Mayuri  || Mr. P V Narsimha Rao ",
    
    // SKILLNEXT-3
    "SKILLNEXT BATCH-3_CP": "Dr. C V R Padmaja || Dr. B Padmaja  ",
    "SKILLNEXT BATCH-3_JFS": "Mr. I N V Surya Narayana  || Ms. K Mayuri ",
    "SKILLNEXT BATCH-3_DBMS": "Ms. K Mayuri  || Dr. A Naresh Kumar  ",

    // SKILLBRIDGE-1
    "SKILLBRIDGE BATCH-1_CP": "Dr. D Khalandar Basha || Ms. S Lakshmana Chary ",
    "SKILLBRIDGE BATCH-1_JFS": "Ms. M Padmaja || Mr. B Madhusudhan Rao ",
    "SKILLBRIDGE BATCH-1_DBMS": "Mr. B Ramesh || Dr. S China Venkateswarlu ",

    // SKILLBRIDGE-2
    "SKILLBRIDGE BATCH-2_CP": "Mr. A Srikanth || Mr. P Shiva Kumar ",
    "SKILLBRIDGE BATCH-2_JFS": "Mr. B Madhusudhan Rao || Ms. K Mayuri ",
    "SKILLBRIDGE BATCH-2_DBMS": "Mr. B Ramesh || Dr. S China Venkateswarlu ",

    // SKILLBRIDGE-3
    "SKILLBRIDGE BATCH-3_CP": "Dr. V Maheshwar Reddy || Mr. S Srikanth",
    "SKILLBRIDGE BATCH-3_JFS": "Mr. I N V Surya Narayana || Mr. E Krishna Rao Patro",
    "SKILLBRIDGE BATCH-3_DBMS": "Mr. B Ramesh || Dr. M Madhusudhan Reddy ",

    // SKILLBRIDGE-4
    "SKILLBRIDGE BATCH-4_CP": "Mr. A Srikanth || Mr. P Venkata Mahesh ",
    "SKILLBRIDGE BATCH-4_JFS": "Mr. B Madhusudhan Rao || Mr. E Krishna Rao Patro ",
    "SKILLBRIDGE BATCH-4_DBMS": "Mr. P V Narasimha Rao  || Ms. K Mayuri ",

    // SKILLBRIDGE-5
    "SKILLBRIDGE BATCH-5_CP": "Dr. D Khalandar Basha  || Dr. V Ajay Kishen Kumar ",
    "SKILLBRIDGE BATCH-5_JFS": "Ms. M Padmaja || Dr. S China Venkateswarlu",
    "SKILLBRIDGE BATCH-5_DBMS": "Mr. P V Narasimha Rao  || Mr. B Ramesh "

    
    
  };

 const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  let allTodaySchedules = [];

  assignedBatches.forEach(batch => {
    const slots = (batchWiseTimetable[batch] && batchWiseTimetable[batch][today]) || [];
    slots.forEach(slot => {
      const key = `${batch}_${slot.subject}`;
      const facultyList = batchSubjectFacultyMap[key] || "N/A";
      allTodaySchedules.push({
        batch,
        subject: slot.subject,
        room: slot.room,
        time: slot.time,
        faculty: facultyList
      });
    });
  });

  if (!allTodaySchedules.length) {
    container.innerHTML = "<p class='no-classes'>🎉 No classes scheduled for today!</p>";
    return;
  }

  container.innerHTML = allTodaySchedules.map(slot => `
    <div class="period">
      <div class="left">
        <span class="material-icons-sharp">schedule</span>
        <div class="info">
          <div class="subject-line">
            <div class="subject"><b>${slot.subject}</b></div>
            <div class="faculty"><b>${slot.faculty}</b></div>
          </div>
          <div class="room">Room: ${slot.room}</div>
          <div class="faculty-batch">Batch: ${slot.batch}</div>
        </div>
      </div>
      <div class="time">${slot.time}</div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderFacultyTimetable(); // should happen AFTER timetable is defined
});




///  Announcements Section


// window.addEventListener("DOMContentLoaded", () => {
//   const facultyData = JSON.parse(localStorage.getItem("facultyData"));
//   const batch = profileData.batch;

//   const formatBatch = batch
//     .replace(/BATCH/gi, "")
//     .replace(/\s+/g, "-")
//     .replace(/-+/g, "-")
//     .replace(/^-|-$/g, "")
//     .toLowerCase();

//   if (formatBatch) {
//     fetchAnnouncements(formatBatch);
//   }
// });

// function fetchAnnouncements(batch) {
//   fetch(`${backendUrl}/api/student/announcements/${batch}`)
//     .then(res => res.json())
//     .then(data => {
//       const list = document.getElementById("announcementList");
//       list.innerHTML = "";

//       if (!data.announcements || data.announcements.length === 0) {
//         list.innerHTML = "<li>No announcements available.</li>";
//         return;
//       }

//       const announcementsToShow = data.announcements.slice(0, 3);

//       announcementsToShow.forEach((announcement, index) => {
//         const card = document.createElement("li");
//         card.classList.add("announcement-card");

//         const formattedContent = formatContent(announcement.content);

//         card.innerHTML = `
//           <div class="announcement-title">${announcement.title}</div>
//           <div class="announcement-subtitle">${announcement.subtitle}</div>
//           <div class="announcement-content" id="content-${index}">
//             ${formattedContent}
//           </div>
//           <button class="copy-btn" onclick="copyToClipboard(${index})" title="Copy Announcement">
//             <span class="material-icons-sharp">content_copy</span>
//           </button>
//         `;

//         list.appendChild(card);
//       });
//     })
//     .catch(error => {
//       console.error("Failed to load announcements:", error);
//       document.getElementById("announcementList").innerHTML = "<li>Error loading announcements.</li>";
//     });
// }

// function formatContent(content) {
//   const urlRegex = /(https?:\/\/[^\s]+)/g;
//   return content.replace(urlRegex, url => {
//     return `<a href="${url}" target="_blank" class="announcement-link">${url}</a>`;
//   });
// }

// function copyToClipboard(index) {
//   const title = document.querySelectorAll(".announcement-title")[index]?.innerText || "";
//   const subtitle = document.querySelectorAll(".announcement-subtitle")[index]?.innerText || "";
//   const content = document.getElementById(`content-${index}`)?.innerText || "";

//   const fullText = `${title}\n${subtitle}\n${content}`;
//   navigator.clipboard.writeText(fullText).then(() => {
//     showCopyPopup(index);
//   }).catch(err => {
//     console.error("Failed to copy:", err);
//   });
// }

// function showCopyPopup(index) {
//   const card = document.querySelectorAll(".announcement-card")[index];
//   const popup = document.createElement("div");
//   popup.className = "copy-popup";
//   popup.textContent = "Copied!";

//   card.appendChild(popup);

//   setTimeout(() => {
//     popup.classList.add("show");
//     setTimeout(() => {
//       popup.classList.remove("show");
//       setTimeout(() => card.removeChild(popup), 300);
//     }, 1500);
//   }, 10);
// }

