// Dashboard specific
if (window.location.pathname.includes('dashboard')) {
    let selectedPackage = null;
    let currentOrderId = null;

    const guildModal = document.getElementById('guildModal');
    const paymentModal = document.getElementById('paymentModal');
    const successOverlay = document.getElementById('successOverlay');
    const continueBtn = document.getElementById('continueBtn');
    const closeBtns = document.querySelectorAll('.close');

    // Open Guild Modal when package selected
    document.querySelectorAll('.package-card').forEach(card => {
        const btn = card.querySelector('.select-btn');
        btn.addEventListener('click', () => {
            selectedPackage = card.getAttribute('data-package');
            guildModal.style.display = 'flex';
        });
    });

    // Close modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            guildModal.style.display = 'none';
            paymentModal.style.display = 'none';
        });
    });

    // Handle Guild Form: create order via backend
    document.getElementById('guildForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const guildId = document.getElementById('guildId').value.trim();
        const leaderId = document.getElementById('leaderId').value.trim();

        if (!guildId || !leaderId) {
            alert('Please fill both fields');
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/create_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    package: selectedPackage,
                    guild_id: guildId,
                    leader_id: leaderId
                })
            });
            const data = await response.json();

            if (response.ok) {
                currentOrderId = data.order_id;
                document.getElementById('upiIdDisplay').innerText = data.upi_id;
                guildModal.style.display = 'none';
                paymentModal.style.display = 'flex';
            } else {
                alert('Error: ' + (data.error || 'Something went wrong'));
            }
        } catch (error) {
            alert('Network error: ' + error.message);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // Handle Payment Form: submit transaction ID
    document.getElementById('paymentForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const transactionId = document.getElementById('transactionId').value.trim();
        const msgDiv = document.getElementById('paymentMsg');

        if (!transactionId) {
            msgDiv.innerText = 'Please enter transaction ID';
            msgDiv.style.color = 'red';
            return;
        }

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/submit_payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: currentOrderId,
                    transaction_id: transactionId
                })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                // Close payment modal
                paymentModal.style.display = 'none';
                // Show success overlay with confetti
                successOverlay.style.display = 'flex';
                // Trigger confetti effects
                canvasConfetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ff416c', '#00ffff', '#ffd700', '#28a745']
                });
                canvasConfetti({
                    particleCount: 100,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.7 },
                    colors: ['#ff416c', '#00ffff']
                });
                canvasConfetti({
                    particleCount: 100,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.7 },
                    colors: ['#ff416c', '#00ffff']
                });
                // Reset payment form
                document.getElementById('paymentForm').reset();
                msgDiv.innerHTML = '';
            } else {
                msgDiv.innerText = 'Error: ' + (data.error || 'Submission failed');
                msgDiv.style.color = 'red';
            }
        } catch (error) {
            msgDiv.innerText = 'Network error: ' + error.message;
            msgDiv.style.color = 'red';
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // Copy UPI ID
    const copyBtn = document.getElementById('copyUpiBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const upiId = document.querySelector('.upi-id').innerText;
            navigator.clipboard.writeText(upiId);
            alert('UPI ID copied: ' + upiId);
        });
    }

    // Continue button: hide overlay and optionally reload/clear state
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            successOverlay.style.display = 'none';
            // Reset order flow
            selectedPackage = null;
            currentOrderId = null;
            document.getElementById('guildForm').reset();
            // Optionally reload the page to reset everything
            // window.location.reload(); // uncomment if needed
        });
    }
}