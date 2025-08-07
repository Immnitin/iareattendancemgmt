      const form = document.getElementById("loginForm");
      const messageBox = document.getElementById("messageBox");
      const signInBtn = document.getElementById("loginBtn");
      const btnText = document.getElementById("btnText");
      const loader = document.getElementById("loader");
      const backendUrl = "https://iareattendancemgmt.onrender.com";

      // Role selector functionality
      const labels = document.querySelectorAll("#roleSelector label");

      function updateActive() {
        labels.forEach((label) => {
          const radio = label.querySelector('input[type="radio"]');
          if (radio.checked) {
            label.classList.add("selected");
          } else {
            label.classList.remove("selected");
          }
        });
      }

      labels.forEach((label) => {
        label.addEventListener("click", () => {
          setTimeout(updateActive, 10);
        });
      });

      updateActive();

      // Form submission
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const roleInput = document.querySelector('input[name="role"]:checked');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleInput ? roleInput.value : "";
        // const backendUrl = "http://localhost:5000"
        // Clear previous messages
        messageBox.classList.remove("show", "success", "error");
        messageBox.textContent = "";

        // Validation
        if (!username || !password || !role) {
          showMessage(
            "Please fill in all fields and select your role.",
            "error"
          );
          return;
        }

        const endpoint = `${backendUrl}/api/${role}login/login`;

        // Show loading state
        btnText.textContent = "Signing in...";
        loader.classList.add("visible");
        signInBtn.disabled = true;

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          const data = await response.json();

          if (response.ok) {
            showMessage("Login successful!...", "success");

            // Store user data and redirect
            if (role === "student" && data.student?.rollno) {
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("rollno", data.student.rollno);
              localStorage.setItem("profileData", JSON.stringify(data.student));
              setTimeout(() => {
                window.location.href = "Dashboard/index.html";
              }, 2500);
            } else if (role === "faculty") {
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("facultyid", data.faculty.facultyid);
              localStorage.setItem("facultyData", JSON.stringify(data.faculty));
              setTimeout(() => {
                window.location.href = "FacultyPage/index.html";
              }, 2500);
            } else if (role === "admin") {
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("adminId", data.adminId);
              setTimeout(() => {
                window.location.href = "AdminSection/index.html";
              }, 2500);
            }
          } else {
            showMessage(
              data.message || "Invalid credentials. Please try again.",
              "error"
            );
          }
        } catch (error) {
          console.error("Login error:", error);
          showMessage(
            "Connection error. Please check your internet and try again.",
            "error"
          );
        } finally {
          // Reset button state
          btnText.textContent = "Sign In";
          loader.classList.remove("visible");
          signInBtn.disabled = false;
        }
      });

      function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.classList.add("show", type);
        setTimeout(() => {
          messageBox.classList.remove("show");
        }, 4000);
      }
