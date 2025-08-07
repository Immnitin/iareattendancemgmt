const sideMenu = document.querySelector("aside");
const profileBtn = document.querySelector("#profile-btn");
const themeToggler = document.querySelector(".theme-toggler");
const nextDay = document.getElementById('nextDay');
const prevDay = document.getElementById('prevDay');
const backendUrl = "https://iareattendancemgmt.onrender.com";
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
  if (window.scrollY > 0) { document.querySelector('header').classList.add('active'); }
  else { document.querySelector('header').classList.remove('active'); }
}

window.addEventListener("load", () => {
  const spinner = document.getElementById("spinner-overlay");
  if (spinner) {
    spinner.style.opacity = "1";
    setTimeout(() => {
      spinner.style.transition = "opacity 0.3s ease";
      spinner.style.opacity = "0";
      setTimeout(() => {
        spinner.style.display = "none";
      }, 300); // matches transition time
    }, 1000); // delay to show spinner at least 1s
  }
});


function updateProfileUI(student) {

  const roll = student.rollno || "N/A";
  const batch = student.batch || "N/A";

  // Profile Details
  document.getElementById("profileName").textContent = student.name || "N/A";
  document.getElementById("profileRollNo").textContent = roll;
  document.getElementById("profileBranch").textContent = student.branch || "N/A";
  document.getElementById("profileBatch").textContent = batch;
  document.getElementById("profileEmail").textContent = student.email || "N/A";

  // Card Top Text
  document.getElementById("cardRoll").textContent = `Roll No: ${roll}`;
  document.getElementById("cardBatch").textContent = `Batch: ${batch}`;

  // Profile Photo
  const photoUrl = `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${roll}/${roll}.jpg`;
  document.getElementById("cardPhoto").src = photoUrl;
  document.getElementById("cardPhoto").alt = `${roll} Profile Photo`;

  // QR Code
  if (student.qrLink) {
    const qrImage = document.getElementById("qrImage");
    qrImage.src = student.qrLink;
    qrImage.alt = `${roll} QR Code`;
    qrImage.classList.add("qr-image");
  }

  //For Tampering Prevention

  const img = document.getElementById('qrImage');
  const originalSrc = student.qrLink;
  let tamperDetected = false;

  setInterval(() => {
    if (!tamperDetected && img.src !== originalSrc) {
      tamperDetected = true; // Prevent multiple alerts
      alert("Tampering detected!");
      location.reload(); // Reload once
    }
  }, 1000);
}

function updateAttendanceUI(attendanceData) {
  const { overallAttendance, courseAttendance } = attendanceData;
  const container = document.getElementById("attendanceCardsContainer");
  container.innerHTML = ""; // Clear any previous cards

  // Helper to create a card
  function createCard(title, present, total, icon, colorClass = "") {
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);
    
    // Circle configuration
    const radius = 36;
    const circumference = 2 * Math.PI * radius; // More precise calculation
    
    // Calculate stroke-dashoffset for progress
    let strokeDashoffset = circumference;
    if (total > 0 && percent > 0) {
      // For proper animation, we need to calculate how much of the circle to fill
      const progressRatio = percent / 100;
      strokeDashoffset = circumference * (1 - progressRatio);
    }

    const div = document.createElement("div");
    div.className = `${colorClass}`;

    div.innerHTML = `
      <span class="material-icons-sharp">${icon}</span>
      <h3>${title}</h3>
      <h2>${present}/${total}</h2>
      <div class="progress">
        <svg>
          <circle 
            cx="38" 
            cy="38" 
            r="${radius}"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeDashoffset}"
            transform="rotate(-90 38 38)"
            style="transition: stroke-dashoffset 0.5s ease-in-out;">
          </circle>
        </svg>
        <div class="number"><p>${percent}%</p></div>
      </div>
      <small class="text-muted">Last 24 Hours</small>
    `;

    container.appendChild(div);
  }

  // Add overall attendance card
  createCard("Overall Attendance", overallAttendance.presentDays, overallAttendance.totalDays, "architecture", "eg");

  // Map for icon and color class
  const courseMeta = {
    JFS: { name: "Java FullStack Development", icon: "computer", class: "cs" },
    CP: { name: "Competitive Programming", icon: "functions", class: "mth" },
    DBMS: { name: "Database Management", icon: "storage", class: "cg" },
    AWS: { name: "Amazon Web Services", icon: "computer", class: "cs" },
  };

  // Loop through each course and render
  Object.entries(courseAttendance).forEach(([key, { presentDays, totalDays }]) => {
    const meta = courseMeta[key] || {
      name: key,
      icon: "school",
      class: "net"
    };
    createCard(meta.name, presentDays, totalDays, meta.icon, meta.class);
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const rollno = localStorage.getItem("rollno");
   if (!rollno) {
      window.location.href = "/";
      return;
    }

  // Profile fetch and cache
  const cachedProfileRaw = localStorage.getItem("profileData");
  let batch = null;

  if (cachedProfileRaw) {
    try {
      const cachedProfile = JSON.parse(cachedProfileRaw);
      updateProfileUI(cachedProfile);
      batch = cachedProfile.batch || "";

      const cacheTime = localStorage.getItem("profileDataTimestamp");
      if (cacheTime && Date.now() - parseInt(cacheTime) < 3600000) {
        console.log("Using cached profile.");
      } else {
        fetch(`${backendUrl}/api/student/${encodeURIComponent(rollno)}`)
          .then(res => res.json())
          .then(data => {
            const student = data.student || data;
            localStorage.setItem("profileData", JSON.stringify(student));
            localStorage.setItem("profileDataTimestamp", Date.now().toString());
            updateProfileUI(student);
            batch = student.batch || "";
          })
          .catch(err => {
            console.error("Profile fetch error:", err);
          });
      }
    } catch (err) {
      console.error("Invalid cached profile:", err);
    }
  }

  if (!batch) {
    console.warn("Batch missing, cannot fetch attendance.");
    return;
  }
  const formattedBatch = batch
    .replace(/BATCH/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  fetch(`${backendUrl}/api/facultyop/attendance?rollno=${encodeURIComponent(rollno)}&batch=${encodeURIComponent(formattedBatch)}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    })
    .then((data) => {
      updateAttendanceUI(data);
    })
    .catch((err) => {
      console.error("Attendance fetch error:", err);
    });

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
  "SKILLNEXT-1": {
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
  "SKILLNEXT-2": {
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
  "SKILLNEXT-3": {
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

function renderTodayTimetable() {
  const container = document.getElementById("timetableContainer");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const studentDataRaw = localStorage.getItem("profileData");
  let batch = "";
  if (studentDataRaw) {
    try {
      const studentData = JSON.parse(studentDataRaw);
      batch = studentData.batch || "";
    } catch (e) {
      console.warn("Failed to parse profileData from localStorage.");
    }
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

  const todaySchedule = (batchWiseTimetable[batch] && batchWiseTimetable[batch][today]) || [];

  if (todaySchedule.length === 0) {
    container.innerHTML = '<p class="no-classes">🎉 No classes scheduled for today!</p>';
    return;
  }

  container.innerHTML = todaySchedule.map(slot => {
  const facultyKey = `${batch}_${slot.subject}`;
  const facultyName = batchSubjectFacultyMap[facultyKey] || "N/A";

  return `
    <div class="period">
      <div class="left">
        <span class="material-icons-sharp">schedule</span>
        <div class="info">
          <div class="subject-line">
            <div class="subject">${slot.subject}</div>
            <div class="faculty"><b>${facultyName}</b></div>
          </div>
          <div class="room">Room: ${slot.room}</div>
        </div>
      </div>
      <div class="time">${slot.time}</div>
    </div>
  `;
}).join("");

}

document.addEventListener("DOMContentLoaded", renderTodayTimetable);

function logout() {
  localStorage.clear();
  window.location.href = '/';
}



// Announcements Selection


window.addEventListener("DOMContentLoaded", () => {
    
    const profileData = JSON.parse(localStorage.getItem("profileData"));
    const batch = profileData.batch;

    const formatBatch = batch
      .replace(/BATCH/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    if (formatBatch) {
      fetchAnnouncements(formatBatch);
    }
  });

  function fetchAnnouncements(batch) {
  fetch(`${backendUrl}/api/student/announcements/${batch}`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById("announcementList");
      list.innerHTML = "";

      if (!data.announcements || data.announcements.length === 0) {
        list.innerHTML = "<li>No announcements available.</li>";
        return;
      }

      const announcementsToShow = data.announcements.slice(0, 3);

      announcementsToShow.forEach((announcement, index) => {
        const card = document.createElement("li");
        card.classList.add("announcement-card");

        const formattedContent = formatContent(announcement.content);

        card.innerHTML = `
          <div class="announcement-title">${announcement.title}</div>
          <div class="announcement-subtitle">${announcement.subtitle}</div>
          <div class="announcement-content" id="content-${index}">
            ${formattedContent}
          </div>
          <button class="copy-btn" onclick="copyToClipboard(${index})" title="Copy Announcement">
            <span class="material-icons-sharp">content_copy</span>
          </button>
        `;

        list.appendChild(card);
      });
    })
    .catch(error => {
      console.error("Failed to load announcements:", error);
      document.getElementById("announcementList").innerHTML = "<li>Error loading announcements.</li>";
    });
}

function formatContent(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" class="announcement-link">${url}</a>`;
  });
}

function copyToClipboard(index) {
  const title = document.querySelectorAll(".announcement-title")[index]?.innerText || "";
  const subtitle = document.querySelectorAll(".announcement-subtitle")[index]?.innerText || "";
  const content = document.getElementById(`content-${index}`)?.innerText || "";

  const fullText = `${title}\n${subtitle}\n${content}`;
  navigator.clipboard.writeText(fullText).then(() => {
    showCopyPopup(index);
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
}

function showCopyPopup(index) {
  const card = document.querySelectorAll(".announcement-card")[index];
  const popup = document.createElement("div");
  popup.className = "copy-popup";
  popup.textContent = "Copied!";

  card.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
      setTimeout(() => card.removeChild(popup), 300);
    }, 1500);
  }, 10);
}



