document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const messageBox = document.getElementById("message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ⛔️ НИКАКОЙ ПЕРЕЗАГРУЗКИ

    messageBox.textContent = "";
    messageBox.style.color = "black";

    const formData = new FormData(form);

    const payload = {
      name: formData.get("company-name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirm-password"),
      region: formData.get("region"),
      city: formData.get("city"),
      serviceType: formData.get("category"),
      plan: formData.get("plan"),
      role: "provider"
    };

    // Простая валидация
    for (const key in payload) {
      if (!payload[key]) {
        messageBox.textContent = "Vyplňte všetky polia";
        messageBox.style.color = "red";
        return;
      }
    }

    if (payload.password !== payload.confirmPassword) {
      messageBox.textContent = "Heslá sa nezhodujú";
      messageBox.style.color = "red";
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registrácia zlyhala");
      }

      // ✅ УСПЕХ
      messageBox.textContent = "Registrácia úspešná!";
      messageBox.style.color = "green";

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = "/provider-dashboard.html";
      }, 1200);

    } catch (err) {
      console.error(err);
      messageBox.textContent = err.message;
      messageBox.style.color = "red";
    }
  });
});