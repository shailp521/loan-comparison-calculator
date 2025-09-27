let strategies = [];
let strategyCounter = 0;

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

function calculateMonthlyPayment(principal, rate, years) {
    if (rate === 0) return principal / (years * 12);
    const monthlyRate = rate / 100 / 12;
    const payments = years * 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1);
}

function calculateYearsFromStartDate(startDate) {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return diffYears;
}

function calculateRemainingBalance(originalAmount, rate, termYears, yearsPaid) {
    const monthlyRate = rate / 100 / 12;
    const totalPayments = termYears * 12;
    const paymentsMade = yearsPaid * 12;

    // Calculate original monthly payment
    const monthlyPayment = originalAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                         (Math.pow(1 + monthlyRate, totalPayments) - 1);

    // Calculate remaining balance using amortization formula
    let balance = originalAmount;
    for (let i = 0; i < paymentsMade; i++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;
    }

    return {
        remainingBalance: Math.max(0, balance),
        monthlyPayment: monthlyPayment,
        remainingTerm: termYears - yearsPaid
    };
}

function updateStrategyForm() {
    const strategyType = document.getElementById('strategyType').value;
    const additionalFields = document.getElementById('additionalFields');

    let html = '';

    if (strategyType === 'current') {
        html = `
            <div class="form-group">
                <label for="loanStartDate">Loan Start Date</label>
                <input type="date" id="loanStartDate" placeholder="When did your loan start?">
            </div>
        `;
    } else if (strategyType === 'buydown-1-0') {
        html = `
            <div class="form-group">
                <label for="buydownCost">Buydown Cost ($)</label>
                <input type="number" id="buydownCost" step="0.01" value="0" placeholder="Enter buydown cost">
            </div>
        `;
    } else if (strategyType === 'buydown-2-1') {
        html = `
            <div class="form-group">
                <label for="buydownCost">Buydown Cost ($)</label>
                <input type="number" id="buydownCost" step="0.01" value="0" placeholder="Enter buydown cost">
            </div>
        `;
    }

    additionalFields.innerHTML = html;

    // Set default loan start date to today
    if (strategyType === 'current') {
        const loanStartDateField = document.getElementById('loanStartDate');
        if (loanStartDateField) {
            loanStartDateField.valueAsDate = new Date();
        }
    }
}

function addStrategy() {
    try {
        const strategyType = document.getElementById('strategyType').value;
        const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
        const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
        const loanTerm = parseInt(document.getElementById('loanTerm').value) || 30;
        const pmiAmount = parseFloat(document.getElementById('pmiAmount').value) || 0;

        // Validation
        const missingFields = [];

        if (loanAmount === 0) missingFields.push('Loan Amount');
        if (interestRate === 0) missingFields.push('Interest Rate');
        if (loanAmount < 1000) missingFields.push('Loan Amount (minimum $1,000)');
        if (interestRate < 0.1 || interestRate > 50) missingFields.push('Interest Rate (must be between 0.1% and 50%)');
        if (pmiAmount < 0) missingFields.push('PMI (cannot be negative)');

        // Strategy-specific validation
        if (strategyType === 'current') {
            const loanStartDateEl = document.getElementById('loanStartDate');

            if (!loanStartDateEl || loanStartDateEl.value === '') {
                missingFields.push('Loan Start Date is required');
            } else {
                const startDate = new Date(loanStartDateEl.value);
                const today = new Date();
                if (startDate > today) {
                    missingFields.push('Loan Start Date cannot be in the future');
                }

                const yearsPaid = calculateYearsFromStartDate(loanStartDateEl.value);
                if (yearsPaid >= loanTerm) {
                    missingFields.push('Loan Start Date indicates loan should be paid off already');
                }
            }
        } else if (strategyType.startsWith('buydown')) {
            const buydownCostEl = document.getElementById('buydownCost');
            if (buydownCostEl && parseFloat(buydownCostEl.value) < 0) {
                missingFields.push('Buydown Cost (cannot be negative)');
            }
        }

        if (missingFields.length > 0) {
            alert('Please correct the following:\n\n• ' + missingFields.join('\n• '));
            return;
        }

        const strategy = {
            id: Date.now(),
            type: strategyType,
            name: getStrategyTypeLabel(strategyType),
            loanAmount: loanAmount,
            interestRate: interestRate,
            loanTerm: loanTerm,
            pmiAmount: pmiAmount
        };

        // Add type-specific fields with auto-calculation
        if (strategyType === 'current') {
            const loanStartDate = document.getElementById('loanStartDate').value;
            const yearsPaid = calculateYearsFromStartDate(loanStartDate);
            const remainingData = calculateRemainingBalance(loanAmount, interestRate, loanTerm, yearsPaid);

            strategy.remainingBalance = remainingData.remainingBalance;
            strategy.currentPayment = remainingData.monthlyPayment;
            strategy.remainingTerm = remainingData.remainingTerm;
            strategy.yearsPaid = yearsPaid;
            strategy.loanStartDate = loanStartDate;
        } else if (strategyType.startsWith('buydown')) {
            const buydownCostEl = document.getElementById('buydownCost');
            strategy.buydownCost = buydownCostEl ? (parseFloat(buydownCostEl.value) || 0) : 0;
        }

        strategies.push(strategy);
        updateStrategiesDisplay();
        clearForm();

        // Show comparison button if we have 2 or more strategies
        if (strategies.length >= 2) {
            document.getElementById('showComparisonBtn').style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error adding strategy:', error);
        alert('Error adding strategy. Please check all fields are filled correctly.');
    }
}

function removeStrategy(id) {
    strategies = strategies.filter(s => s.id !== id);
    updateStrategiesDisplay();

    if (strategies.length < 2) {
        document.getElementById('showComparisonBtn').style.display = 'none';
        document.getElementById('comparisonSection').style.display = 'none';
    }
}

function clearAllStrategies() {
    strategies = [];
    updateStrategiesDisplay();
    document.getElementById('showComparisonBtn').style.display = 'none';
    document.getElementById('comparisonSection').style.display = 'none';
}

function showComparison() {
    if (strategies.length < 2) {
        alert('Please add at least 2 strategies to compare');
        return;
    }

    document.getElementById('comparisonSection').style.display = 'block';
    updateComparison();

    // Scroll to comparison section
    document.getElementById('comparisonSection').scrollIntoView({
        behavior: 'smooth'
    });
}

function clearForm() {
    document.getElementById('loanAmount').value = '';
    document.getElementById('interestRate').value = '';
    document.getElementById('loanTerm').value = '30';
    document.getElementById('pmiAmount').value = '0';
    updateStrategyForm();
}

function updateStrategiesDisplay() {
    const container = document.getElementById('strategiesContainer');

    if (strategies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No strategies added yet</h3>
                <p>Add your first loan strategy above to begin comparison</p>
            </div>
        `;
        return;
    }

    let html = '';
    strategies.forEach(strategy => {
        let monthlyPayment;
        if (strategy.type === 'current') {
            monthlyPayment = strategy.currentPayment || 0;
        } else {
            monthlyPayment = calculateMonthlyPayment(strategy.loanAmount, strategy.interestRate, strategy.loanTerm);
        }

        html += `
            <div class="strategy-card ${strategy.type}">
                <div class="strategy-header">
                    <div class="strategy-title">${strategy.name}</div>
                    <button class="btn btn-danger" onclick="removeStrategy(${strategy.id})" style="padding: 5px 10px; font-size: 12px;">Remove</button>
                </div>
                <div class="strategy-details">
                    <div><strong>Type:</strong> ${getStrategyTypeLabel(strategy.type)}</div>
                    <div><strong>Amount:</strong> ${formatCurrency(strategy.type === 'current' ? strategy.remainingBalance : strategy.loanAmount)}</div>
                    <div><strong>Rate:</strong> ${strategy.interestRate}%</div>
                    <div><strong>Term:</strong> ${strategy.type === 'current' ? strategy.remainingTerm.toFixed(1) : strategy.loanTerm} years</div>
                    <div><strong>Payment:</strong> ${formatCurrency(monthlyPayment)}</div>
                    <div><strong>PMI:</strong> ${formatCurrency(strategy.pmiAmount)}</div>
                    ${strategy.type === 'current' ? `<div><strong>Started:</strong> ${new Date(strategy.loanStartDate).toLocaleDateString()}</div>` : ''}
                    ${strategy.buydownCost ? `<div><strong>Buydown Cost:</strong> ${formatCurrency(strategy.buydownCost)}</div>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getStrategyTypeLabel(type) {
    const labels = {
        'current': 'Current Loan',
        'fixed': 'Fixed Term',
        'buydown-1-0': '1-0 Buydown',
        'buydown-2-1': '2-1 Buydown'
    };
    return labels[type] || type;
}

function updateComparison() {
    if (strategies.length < 2) return;

    const monthsValue = document.getElementById('scheduleMonths').value;
    let months;

    if (monthsValue === 'full') {
        // Calculate the maximum term across all strategies
        months = Math.max(...strategies.map(s => s.loanTerm * 12));
    } else {
        months = parseInt(monthsValue);
    }

    generateOverviewComparison();
    generateScheduleComparison(months);
}

function calculateAccurateTotals(strategy) {
    // Calculate accurate totals using the full payment schedule
    const fullSchedule = calculatePaymentSchedule(strategy, strategy.loanTerm * 12);

    let totalPayments = 0;
    let totalInterest = 0;
    let totalPrincipal = 0;

    for (let payment of fullSchedule) {
        totalPayments += payment.payment;
        totalInterest += payment.interest;
        totalPrincipal += payment.principal;
    }

    return {
        totalPayments: totalPayments,
        totalInterest: totalInterest,
        totalPrincipal: totalPrincipal
    };
}

function generateOverviewComparison() {
    const container = document.getElementById('overviewComparison');

    // Calculate all strategy totals for entire loan duration for fair comparison
    const strategyTotals = strategies.map(strategy => {
        if (strategy.type === 'current') {
            // For current loans, calculate total cost for the ENTIRE original loan
            const originalMonthlyPayment = calculateMonthlyPayment(strategy.loanAmount, strategy.interestRate, strategy.loanTerm);
            const totalPayments = originalMonthlyPayment * strategy.loanTerm * 12;
            const totalInterest = totalPayments - strategy.loanAmount;

            return {
                totalPayments: totalPayments,
                totalInterest: totalInterest,
                totalCost: totalPayments + (strategy.buydownCost || 0),
                originalLoan: true
            };
        } else if (strategy.type.startsWith('buydown')) {
            const accurateTotals = calculateAccurateTotals(strategy);
            return {
                totalPayments: accurateTotals.totalPayments,
                totalInterest: accurateTotals.totalInterest,
                totalCost: accurateTotals.totalPayments + (strategy.buydownCost || 0)
            };
        } else {
            const monthlyPayment = calculateMonthlyPayment(strategy.loanAmount, strategy.interestRate, strategy.loanTerm);
            const totalPayments = monthlyPayment * strategy.loanTerm * 12;
            const totalInterest = totalPayments - strategy.loanAmount;
            return {
                totalPayments: totalPayments,
                totalInterest: totalInterest,
                totalCost: totalPayments + (strategy.buydownCost || 0)
            };
        }
    });

    // Use first strategy as baseline for savings calculations
    const baselineTotalCost = strategyTotals[0].totalCost;

    let html = '<div class="overview-grid">';

    strategies.forEach((strategy, index) => {
        const totals = strategyTotals[index];

        // Get payment for display (original loan payment for comparison)
        let displayPayment;
        if (strategy.type === 'current') {
            // Show original loan payment for fair comparison in overview
            displayPayment = calculateMonthlyPayment(strategy.loanAmount, strategy.interestRate, strategy.loanTerm);
        } else if (strategy.type.startsWith('buydown')) {
            const firstYearSchedule = calculatePaymentSchedule(strategy, 12);
            displayPayment = firstYearSchedule.length > 0 ? firstYearSchedule[0].payment : 0;
        } else {
            displayPayment = calculateMonthlyPayment(strategy.loanAmount, strategy.interestRate, strategy.loanTerm);
        }

        const totalMonthly = displayPayment + strategy.pmiAmount;

        // Calculate total savings (includes principal + interest + buydown cost)
        const totalSavings = baselineTotalCost - totals.totalCost;

        html += `
            <div class="overview-card">
                <h4>${strategy.name}</h4>
                <div class="metric">
                    <span class="metric-label">Original Loan Amount</span>
                    <span class="metric-value">${formatCurrency(strategy.loanAmount)}</span>
                </div>
                ${strategy.type === 'current' ? `
                <div class="metric">
                    <span class="metric-label">Current Balance</span>
                    <span class="metric-value">${formatCurrency(strategy.remainingBalance)}</span>
                </div>
                ` : ''}
                <div class="metric">
                    <span class="metric-label">Interest Rate</span>
                    <span class="metric-value">${strategy.interestRate}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">${strategy.type === 'current' ? 'Original P&I' : strategy.type.startsWith('buydown') ? 'First Year P&I' : 'Monthly P&I'}</span>
                    <span class="metric-value">${formatCurrency(displayPayment)}</span>
                </div>
                ${strategy.type === 'current' ? `
                <div class="metric">
                    <span class="metric-label">Current P&I</span>
                    <span class="metric-value">${formatCurrency(strategy.currentPayment)}</span>
                </div>
                ` : ''}
                <div class="metric">
                    <span class="metric-label">Monthly PMI</span>
                    <span class="metric-value">${formatCurrency(strategy.pmiAmount)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">${strategy.type === 'current' ? 'Current Total' : strategy.type.startsWith('buydown') ? 'First Year Total' : 'Total Monthly'}</span>
                    <span class="metric-value">${formatCurrency(totalMonthly)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Interest</span>
                    <span class="metric-value">${formatCurrency(totals.totalInterest)}</span>
                </div>
                ${strategy.buydownCost ? `
                <div class="metric">
                    <span class="metric-label">Buydown Cost</span>
                    <span class="metric-value">${formatCurrency(strategy.buydownCost)}</span>
                </div>
                ` : ''}
                <div class="metric">
                    <span class="metric-label">Total Cost</span>
                    <span class="metric-value">${formatCurrency(totals.totalCost)}</span>
                </div>
                ${index > 0 ? `
                <div class="metric">
                    <span class="metric-label">Total Savings</span>
                    <span class="metric-value ${totalSavings >= 0 ? 'savings-positive' : 'savings-negative'}">
                        ${totalSavings >= 0 ? '+' : ''}${formatCurrency(totalSavings)}
                    </span>
                </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function generateScheduleComparison(months) {
    const container = document.getElementById('scheduleComparison');

    // Sort strategies so current loan appears first in payment schedule
    const sortedStrategies = [...strategies].sort((a, b) => {
        if (a.type === 'current' && b.type !== 'current') return -1;
        if (a.type !== 'current' && b.type === 'current') return 1;
        return 0;
    });

    // Calculate payment schedules for each strategy (in sorted order)
    const schedules = sortedStrategies.map(strategy => calculatePaymentSchedule(strategy, months));

    let html = `
        <div class="schedule-table">
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="border-right: 3px solid #34495e;">Month</th>
    `;

    // Generate headers for each strategy (using sorted order)
    sortedStrategies.forEach((strategy, index) => {
        const borderStyle = index < sortedStrategies.length - 1 ? 'border-right: 3px solid #34495e;' : '';
        html += `<th colspan="3" style="${borderStyle}">${strategy.name}</th>`;
    });

    html += `
                    </tr>
                    <tr>
    `;

    sortedStrategies.forEach((strategy, index) => {
        const borderStyle = index < sortedStrategies.length - 1 ? 'border-right: 3px solid #34495e;' : '';
        html += `
            <th>Payment</th>
            <th>Balance</th>
            <th style="${borderStyle}">Savings</th>
        `;
    });

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    // Generate rows for each month
    for (let month = 1; month <= months; month++) {
        // Add year separator
        if (month % 12 === 1 && month > 1) {
            html += `
                <tr>
                    <td colspan="${3 * sortedStrategies.length + 1}" class="year-separator">
                        Year ${Math.ceil(month/12)} Begins
                    </td>
                </tr>
            `;
        }

        html += `<tr><td style="border-right: 3px solid #34495e;"><strong>${month}</strong></td>`;

        // Find the baseline strategy payment for consistent savings calculation
        const baselineStrategy = strategies[0];
        const baselineIndex = sortedStrategies.findIndex(s => s.id === baselineStrategy.id);
        const baselinePayment = schedules[baselineIndex][month - 1]?.payment || 0;

        schedules.forEach((schedule, index) => {
            const monthData = schedule[month - 1];
            const borderStyle = index < sortedStrategies.length - 1 ? 'border-right: 3px solid #34495e;' : '';

            if (monthData) {
                const savingsVsBaseline = baselinePayment - monthData.payment;
                const savingsClass = savingsVsBaseline > 0 ? 'savings-positive' :
                                   savingsVsBaseline < 0 ? 'savings-negative' : '';

                // Don't show savings if baseline strategy payment is 0 (loan ended)
                const showSavings = baselinePayment > 0 && sortedStrategies[index].id !== baselineStrategy.id;

                html += `
                    <td>${formatCurrency(monthData.payment + sortedStrategies[index].pmiAmount)}</td>
                    <td>${formatCurrency(monthData.balance)}</td>
                    <td class="${savingsClass}" style="${borderStyle}">
                        ${!showSavings ? '-' : (savingsVsBaseline >= 0 ? '+' : '') + formatCurrency(savingsVsBaseline)}
                    </td>
                `;
            } else {
                html += `<td>-</td><td>-</td><td style="${borderStyle}">-</td>`;
            }
        });

        html += '</tr>';
    }

    // Add totals row
    html += `<tr class="total-row"><td style="border-right: 3px solid #ffffff;"><strong>TOTALS</strong></td>`;

    // Calculate totals that match the displayed savings column
    const baselineStrategy = strategies[0];
    const baselineIndex = sortedStrategies.findIndex(s => s.id === baselineStrategy.id);

    schedules.forEach((schedule, index) => {
        const totalPayments = schedule.slice(0, months).reduce((sum, month) => sum + month.payment, 0);
        const totalWithPMI = totalPayments + (sortedStrategies[index].pmiAmount * months);
        const finalBalance = schedule[months - 1]?.balance || 0;
        const borderStyle = index < sortedStrategies.length - 1 ? 'border-right: 3px solid #ffffff;' : '';

        // Calculate total savings by summing up the actual monthly savings displayed
        let totalSavings = 0;
        if (sortedStrategies[index].id !== baselineStrategy.id) {
            for (let month = 1; month <= months; month++) {
                const baselinePayment = schedules[baselineIndex][month - 1]?.payment || 0;
                const currentPayment = schedule[month - 1]?.payment || 0;

                // Only count savings when baseline has a payment (not ended)
                if (baselinePayment > 0) {
                    totalSavings += (baselinePayment - currentPayment);
                }
            }
        }

        const savingsClass = totalSavings > 0 ? 'savings-positive' :
                           totalSavings < 0 ? 'savings-negative' : '';

        html += `
            <td>${formatCurrency(totalWithPMI)}</td>
            <td>${formatCurrency(finalBalance)}</td>
            <td class="${savingsClass}" style="${borderStyle}">
                ${sortedStrategies[index].id === baselineStrategy.id ? '-' : (totalSavings >= 0 ? '+' : '') + formatCurrency(totalSavings)}
            </td>
        `;
    });

    html += '</tr></tbody></table></div>';

    container.innerHTML = html;
}

function calculatePaymentSchedule(strategy, months) {
    const schedule = [];
    let balance;
    let payment;

    // For current loans, use actual remaining balance and current payment
    if (strategy.type === 'current') {
        balance = strategy.remainingBalance;
        payment = strategy.currentPayment;
    } else {
        balance = strategy.loanAmount;
    }

    for (let month = 1; month <= months; month++) {
        let currentRate = strategy.interestRate;

        // Adjust rate for buydown strategies
        if (strategy.type === 'buydown-1-0' && month <= 12) {
            currentRate = Math.max(0, strategy.interestRate - 1);
        } else if (strategy.type === 'buydown-2-1') {
            if (month <= 12) {
                currentRate = Math.max(0, strategy.interestRate - 2);
            } else if (month <= 24) {
                currentRate = Math.max(0, strategy.interestRate - 1);
            }
        }

        // Calculate remaining term for this payment
        let remainingTerm;
        if (strategy.type === 'current') {
            remainingTerm = Math.max(0, strategy.remainingTerm - ((month - 1) / 12));
        } else {
            remainingTerm = Math.max(0, strategy.loanTerm - ((month - 1) / 12));
        }

        if (remainingTerm <= 0 || balance <= 0.01) {
            // Loan is paid off
            schedule.push({
                month: month,
                payment: 0,
                principal: 0,
                interest: 0,
                balance: 0,
                rate: currentRate
            });
            continue;
        }

        const monthlyRate = currentRate / 100 / 12;

        // For non-current loans, calculate payment based on current balance and rate
        if (strategy.type !== 'current') {
            payment = calculateMonthlyPayment(balance, currentRate, remainingTerm);
        }

        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(payment - interestPayment, balance);

        balance = Math.max(0, balance - principalPayment);

        schedule.push({
            month: month,
            payment: payment,
            principal: principalPayment,
            interest: interestPayment,
            balance: balance,
            rate: currentRate
        });

        if (balance <= 0.01) {
            schedule.push({
                month: month + 1,
                payment: 0,
                principal: 0,
                interest: 0,
                balance: 0,
                rate: currentRate
            });
            break;
        }
    }

    return schedule;
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateStrategyForm();
});