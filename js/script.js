// Toggle form visibility
document.addEventListener("DOMContentLoaded", () => {
    const toggleButtons = document.querySelectorAll(".toggle-form");
    toggleButtons.forEach(button => {
        button.addEventListener("click", () => {
            const formId = button.getAttribute("data-form-id");
            const form = document.getElementById(formId);
            if (form.style.display === "none") {
                form.style.display = "block";
            } else {
                form.style.display = "none";
            }
        });
    });

    // Change transaction status
    const changeStatusButtons = document.querySelectorAll(".change-status");
    changeStatusButtons.forEach(button => {
        button.addEventListener("click", () => {
            const transactionId = button.getAttribute("data-transaction-id");
            alert(`Status transaksi ${transactionId} akan diubah.`);
            // Tambahkan logika untuk mengubah status transaksi di server
        });
    });
});

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    let valid = true;

    // Periksa semua input yang required
    form.querySelectorAll("input[required], textarea[required]").forEach(input => {
        if (!input.value.trim()) {
            valid = false;
            alert(`Field ${input.name} harus diisi.`);
        }
    });

    return valid;
}
