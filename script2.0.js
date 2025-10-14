document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Constants for configuration
    const MAX_MARK = 10;
    const JUZ_START = 1;
    const JUZ_END = 30;
    const PAGES_START = 1;
    const PAGES_END = 20;
    
    // Global array to store all Murajat select elements for unique selection logic
    const murajatSelects = [];

    // --- Utility Functions ---

    /** Rounds a value to the nearest quarter (0.00, 0.25, 0.50, 0.75). */
    function roundToQuarter(value) {
        return Math.round(value * 4) / 4;
    }

    /** Formats the mark to show one decimal (e.g., 9.5) or no decimals if it's an integer (e.g., 10). */
    function formatMark(mark) {
        return mark.toFixed(2).replace(/\.00$/, ''); 
    }

    /** Applies a color class to the card based on the final mark. */
    function applyMarkColorClass(card, finalMark) {
        card.classList.remove('mark-green', 'mark-blue', 'mark-yellow', 'mark-red');
        
        let colorClass = '';

        if (finalMark > 8.00) {
            colorClass = 'mark-green';
        } else if (finalMark >= 7.00) {
            colorClass = 'mark-blue';
        } else if (finalMark > 5.00) {
            colorClass = 'mark-yellow';
        } else {
            colorClass = 'mark-red';
        }
        
        if (colorClass) {
            card.classList.add(colorClass);
        }
    }

    /** Calculates the total mark deduction based on Talqeen, Tanbih, and section type. */
    function calculateDeduction(talqeen, tanbih, rowId, pagesHali = 0) {
      let tqDeduct, tbDeduct; 

      if (rowId !== 'Hali') {
        // Murajat: 1 Talqeen = -1, 1 Tanbih = -0.5
        tqDeduct = talqeen * 1;
        tbDeduct = tanbih * 0.5;
        
      } else {
        // Juz Hali Deduction Tiers
        if (pagesHali >= 1 && pagesHali <= 6) {
          tqDeduct = talqeen * 1; tbDeduct = tanbih * 0.5;
        } else if (pagesHali >= 7 && pagesHali <= 12) {
          tqDeduct = talqeen * 0.5; tbDeduct = tanbih * 0.25;
        } else if (pagesHali >= 13 && pagesHali <= 16) {
          tqDeduct = talqeen * (1/3); tbDeduct = tanbih * (1/6);
        } else if (pagesHali >= 17 && pagesHali <= 20) {
          tqDeduct = talqeen * 0.25; tbDeduct = tanbih * 0.125;
        } else {
            return 0; // No deduction if pages not selected
        }
      }
      
      let totalDeduction = tqDeduct + tbDeduct;
      return roundToQuarter(totalDeduction);
    }

    /** Updates the mark and color for a single Murajat or Juz Hali card. */
    function updateRowMark(card) {
        const rowId = card.getAttribute('data-row-id');
        const talqeenInput = card.querySelector('.talqeen-value');
        const tanbihInput = card.querySelector('.tanbih-value');
        const totalValueInput = card.querySelector('.total-value');
        const pagesSelect = card.querySelector('.pages-select');

        let tqCount = parseInt(talqeenInput.value || '0', 10);
        let tbCount = parseInt(tanbihInput.value || '0', 10);
        
        tqCount = Math.max(0, tqCount);
        tbCount = Math.max(0, tbCount);
        
        let pagesHali = 0;
        if (rowId === 'Hali' && pagesSelect && pagesSelect.value) {
            pagesHali = parseInt(pagesSelect.value, 10);
        }
        
        const deduction = calculateDeduction(tqCount, tbCount, rowId, pagesHali);
        let finalMark = MAX_MARK - deduction;
        finalMark = Math.max(0, roundToQuarter(finalMark));
        
        totalValueInput.value = formatMark(finalMark);
        
        applyMarkColorClass(card, finalMark);
        
        return { mark: finalMark, tq: tqCount, tb: tbCount };
    }


    /** Formats the concise message for sharing via WhatsApp. */
    function formatMessageForSharing(finalResult, haliPages) {
        const murajatCards = document.querySelectorAll('.eval-card:not(.juz-hali)');
        let message = '✅ Hifz Review Results ✅\n\n';
        
        // 1. Murajat Sections (Juz and Mark only)
        let murajatData = [];
        murajatCards.forEach((card) => {
            const juzSelect = card.querySelector('.juz-select');
            if (juzSelect.value) {
                const results = updateRowMark(card);
                murajatData.push({
                    juz: juzSelect.value,
                    mark: results.mark
                });
            }
        });

        if (murajatData.length > 0) {
            message += '*Murajat (Revision) Marks:*\n';
            murajatData.forEach((data) => {
                message += `• Juz ${data.juz}: ${formatMark(data.mark)}/10\n`;
            });
            message += '---------------------------------\n';
        }
        
        // 2. Juz Hali Section (Pages and Mark only)
        const haliCard = document.querySelector('.juz-hali');
        const haliResults = updateRowMark(haliCard);
        
        if (haliPages) {
             message += `*Juz Hali (${haliPages} Pages):*\n`;
             message += `• Mark: ${formatMark(haliResults.mark)}/10\n`;
             message += '---------------------------------\n';
        }
        
        // 3. Final Result (Percentage ONLY)
        const percentageMatch = finalResult.remark.match(/Percentage:\s*([0-9\.]+\%)/);
        const percentageText = percentageMatch ? percentageMatch[1] : 'N/A';
        
        message += `*Final Percentage:*\n`;
        message += percentageText;

        return message;
    }

    /** Handles the click for the Share button (Copy to Clipboard + Open WhatsApp). */
    async function handleShareClick() {
        const messageTextarea = document.getElementById('whatsapp-message-content');
        const message = messageTextarea.value;
        
        if (!message) return;

        try {
            await navigator.clipboard.writeText(message);
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
            
        } catch (err) {
            console.error('Failed to copy or open WhatsApp:', err);
            // Fallback for older browsers
            messageTextarea.select();
            document.execCommand('copy');
            alert('Message copied to clipboard! Opening WhatsApp...');
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }
    }


    // --- Core Logic for Unique Juz Selection ---

    /** Populates all Murajat Juz dropdowns (1-30). */
    function populateJuzSelects() {
        murajatSelects.forEach(select => {
            const currentSelectedValue = select.value;
            select.innerHTML = '<option value="" selected disabled>Select Juz</option>'; // Reset
            
            for (let i = JUZ_START; i <= JUZ_END; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Juz ${i}`;
                if (i.toString() === currentSelectedValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
    }

    /** Disables Juz options that are already selected in another Murajat card. */
    function updateAvailableJuzOptions() {
        const selectedJuzes = murajatSelects
            .map(select => select.value)
            .filter(value => value !== '');

        murajatSelects.forEach(currentSelect => {
            const currentSelectValue = currentSelect.value;
            
            Array.from(currentSelect.options).forEach(option => {
                const optionValue = option.value;
                if (optionValue === '') return;
                
                const isSelectedElsewhere = selectedJuzes.includes(optionValue) && optionValue !== currentSelectValue;
                
                option.disabled = isSelectedElsewhere;
            });
        });
    }

    // --- Event Handlers & Core Logic ---

    /** Updates the result box display. */
    function showResult(text, colorClass) {
        const r = document.getElementById('result-display');
        r.className = '';
        r.classList.add('result-box', colorClass);
        r.textContent = text;
        r.style.display = 'block';
    }

    /** Main function to calculate the final percentage and remark. */
    function calculateFinalResult() {
        const murajatCards = document.querySelectorAll('.eval-card:not(.juz-hali)');
        const haliCard = document.querySelector('.juz-hali');
        const pagesSelect = haliCard.querySelector('.pages-select');
        const shareBtn = document.getElementById('share-whatsapp-btn');
        const messageTextarea = document.getElementById('whatsapp-message-content');
        
        let totalMark = 0;
        let countedSections = 0;
        let haliMark = 0;
        let haliPages = 0;

        // 1. Check Murajat Cards
        murajatCards.forEach(card => {
            const juzSelect = card.querySelector('.juz-select');
            if (juzSelect.value) {
                totalMark += updateRowMark(card).mark;
                countedSections++;
            } else {
                card.classList.remove('mark-green', 'mark-blue', 'mark-yellow', 'mark-red');
            }
        });

        // 2. Check Juz Hali Card (counts as two sections: Mark / Pages)
        if (pagesSelect.value) {
            haliMark = updateRowMark(haliCard).mark;
            haliPages = parseInt(pagesSelect.value, 10);
            totalMark += haliMark;
            countedSections++;
            
            totalMark += MAX_MARK; // Add 10 marks for the pages component
            countedSections++; 
        } else {
             haliCard.classList.remove('mark-green', 'mark-blue', 'mark-yellow', 'mark-red');
        }

        // 3. Validation
        if (countedSections === 0) {
            showResult('Please select at least one Murajat Juz or the Total Pages for Juz Hali to calculate the result.', 'result-red');
            shareBtn.style.display = 'none';
            messageTextarea.value = '';
            return;
        }

        // 4. Final Calculation
        const totalMaxMark = countedSections * MAX_MARK;
        let percentage = (totalMark / totalMaxMark) * 100; 
        percentage = Math.max(0, Math.min(100, percentage));
        const percentageText = percentage.toFixed(2) + '%';

        // 5. CRITICAL CHECK & Remarks
        let remark = '', colorClass = '';
        
        if (pagesSelect.value && haliMark < 6) {
           remark = `Percentage: ${percentageText} — Remark: Hifz Mazbut Karo (Juz Hali mark too low: ${formatMark(haliMark)}/10)`;
           colorClass = 'result-red';
        } else if (percentage >= 87) { 
            remark = `Percentage: ${percentageText} — Remark: 3 Pages`; 
            colorClass = 'result-green';
        } else if (percentage >= 77) { 
            remark = `Percentage: ${percentageText} — Remark: 2 Pages`; 
            colorClass = 'result-blue';
        } else if (percentage >= 70) { 
            remark = `Percentage: ${percentageText} — Remark: 1 Page`; 
            colorClass = 'result-yellow';
        } else { 
            remark = `Percentage: ${percentageText} — Remark: Hifz Mazbut Karo`; 
            colorClass = 'result-red';
        }
        
        // 6. Display Result & Sharing
        showResult(remark, colorClass);
        shareBtn.style.display = 'block';

        const finalResultData = { remark: remark };
        messageTextarea.value = formatMessageForSharing(finalResultData, haliPages);
    }

    // --- Initialization ---

    function initialize() {
        // Collect Murajat selects and populate Juz dropdowns (1-30)
        document.querySelectorAll('.eval-card:not(.juz-hali) .juz-select').forEach(select => {
            murajatSelects.push(select);
        });
        populateJuzSelects();
        
        // Populate Juz Hali Pages Select (1 to 20)
        const pagesSelect = document.querySelector('.juz-hali .pages-select');
        if (pagesSelect) {
            for (let i = PAGES_START; i <= PAGES_END; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i} Pages`;
                pagesSelect.appendChild(option);
            }
        }

        document.querySelectorAll('.eval-card').forEach(card => {
            // Set initial values and marks
            card.querySelectorAll('.ctr-value').forEach(input => input.value = '0');
            updateRowMark(card); 

            // Event delegation for the whole card
            card.addEventListener('click', (event) => {
                const btn = event.target.closest('.ctr-btn');
                if (!btn) return;

                let targetInput = btn.getAttribute('data-type') === 'talqeen' 
                    ? card.querySelector('.talqeen-value') 
                    : card.querySelector('.tanbih-value');

                let currentValue = parseInt(targetInput.value || '0', 10);
                
                if (btn.getAttribute('data-action') === 'plus') {
                    currentValue = Math.min(99, currentValue + 1); 
                } else if (btn.getAttribute('data-action') === 'minus') {
                    currentValue = Math.max(0, currentValue - 1); 
                }
                
                targetInput.value = currentValue;
                updateRowMark(card);
            });

            card.addEventListener('change', (event) => {
                const select = event.target.closest('.full-input');
                if (!select) return;

                if (card.getAttribute('data-row-id') !== 'Hali' && select.classList.contains('juz-select')) {
                    updateAvailableJuzOptions();
                }
                updateRowMark(card);
            });
            
            // Input focus/blur logic
            card.querySelectorAll('.ctr-value').forEach(input => {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.trim().replace(/[^0-9]/g, '');
                    e.target.value = Math.max(0, Math.min(99, parseInt(value || '0', 10)));
                    updateRowMark(card);
                });
                input.addEventListener('focus', () => { if (input.value === '0') input.value = ''; });
                input.addEventListener('blur', () => { 
                    if (input.value === '') input.value = '0';
                    updateRowMark(card);
                });
            });
        });
        
        document.querySelector('.btn-calc').addEventListener('click', calculateFinalResult);
        document.getElementById('share-whatsapp-btn').addEventListener('click', handleShareClick); 
    }

    initialize();
});
