const form = document.querySelector("#admissionForm");
const message = document.querySelector("#message");
const submitButton = document.querySelector("#submitButton");

function showMessage(text, kind) {
  message.textContent = text;
  message.className = `message ${kind}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "message";
  const formData = new FormData(form);
  const selected3 = formData.get("course_3_months") || "";
  const selected6 = formData.get("course_6_months") || "";
  if (!selected3 && !selected6) {
    showMessage("Please select at least one course before submitting.", "error");
    return;
  }
  let course3 = selected3;
  let course6 = selected6;
  const other = document.querySelector("#other_course").value.trim();
  if (other && selected3 === "Other") course3 = `Other: ${other}`;
  if (other && selected6 === "Other") course6 = `Other: ${other}`;

  const payload = {
    name: formData.get("name").trim(),
    father_name: formData.get("father_name").trim(),
    dob_figure: formData.get("dob_figure"),
    dob_words: formData.get("dob_words").trim(),
    admission_date: formData.get("admission_date"),
    qualification: formData.get("qualification"),
    father_occupation: formData.get("father_occupation").trim(),
    student_id: formData.get("student_id").trim(),
    address: formData.get("address").trim(),
    student_mobile: formData.get("student_mobile").trim(),
    guardian_mobile: formData.get("guardian_mobile").trim(),
    course_3_months: course3,
    course_6_months: course6,
    declaration: document.querySelector("#declaration").checked
  };

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";
  try {
    const response = await fetch("/api/admissions", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Could not submit the form.");
    form.reset();
    showMessage(`${result.message} Your application number is ${result.application_id}. Please save this number for your records.`, "success");
    window.scrollTo({top: 0, behavior: "smooth"});
  } catch (error) {
    showMessage(`${error.message} Check your internet connection and try again.`, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Admission Form";
  }
});
