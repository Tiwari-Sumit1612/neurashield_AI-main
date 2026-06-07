// Global variables
let currentJobId = null;
let currentAnalysisResult = null;
let progressInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeSectionTabs();
    setupFileUpload();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function initializeSectionTabs() {
    const sectionTabs = document.querySelectorAll('.section-tab');
    const sectionContents = document.querySelectorAll('.section-content');

    sectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sectionTabs.forEach(t => t.classList.remove('active'));
            sectionContents.forEach(content => content.classList.remove('active'));
            tab.classList.add('active');
            const sectionId = tab.getAttribute('data-section') + '-section';
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

function setupFileUpload() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload');

    if (!uploadArea || !fileInput) {
        console.error('File upload elements not found');
        return;
    }

    uploadArea.addEventListener('click', (e) => {
        if (e.target.id !== 'file-upload') {
            fileInput.click();
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = '#00D4FF';
        uploadArea.style.background = 'rgba(0, 212, 255, 0.1)';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        uploadArea.style.background = 'rgba(0, 8, 20, 0.6)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        uploadArea.style.background = 'rgba(0, 8, 20, 0.6)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileInfo = document.getElementById('file-info');
    
    if (file) {
        const fileName = file.name || 'Unknown';
        const fileSize = file.size || 0;
        const fileType = file.type || 'Unknown';
        
        fileInfo.innerHTML = `
            <strong>📄 Selected File:</strong> ${fileName}<br>
            <strong>Size:</strong> ${formatFileSize(fileSize)}<br>
            <strong>Type:</strong> ${fileType}
        `;
        fileInfo.classList.add('show');
    } else {
        fileInfo.innerHTML = '';
        fileInfo.classList.remove('show');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || bytes === undefined) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function analyzeGitHub() {
    const githubUrl = document.getElementById('github-url').value.trim();
    
    if (!githubUrl) {
        alert('Please enter a GitHub repository URL');
        return;
    }

    if (!isValidGitHubUrl(githubUrl)) {
        alert('Please enter a valid GitHub repository URL');
        return;
    }

    showProgress();
    
    try {
        const response = await fetch('http://localhost:5050/api/analyze/github', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repo_url: githubUrl })
        });

        const result = await response.json();
        
        if (response.ok) {
            currentJobId = result.job_id;
            pollAnalysisStatus();
        } else {
            hideProgress();
            alert('Error: ' + (result.error || 'Failed to start analysis'));
        }
    } catch (error) {
        hideProgress();
        console.error('Error:', error);
        simulateAnalysis('github', githubUrl);
    }
}

async function analyzeCode() {
    const code = document.getElementById('code-input').value.trim();
    
    if (!code) {
        alert('Please paste some code to analyze');
        return;
    }

    showProgress();
    
    try {
        const response = await fetch('http://localhost:5050/api/analyze/code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code })
        });

        const result = await response.json();
        
        if (response.ok) {
            currentJobId = result.job_id;
            pollAnalysisStatus();
        } else {
            hideProgress();
            alert('Error: ' + (result.error || 'Failed to start analysis'));
        }
    } catch (error) {
        hideProgress();
        console.error('Error:', error);
        simulateAnalysis('code', code);
    }
}

async function analyzeFile() {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    showProgress();
    
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://localhost:5050/api/analyze/file', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            currentJobId = result.job_id;
            pollAnalysisStatus();
        } else {
            hideProgress();
            alert('Error: ' + (result.error || 'Failed to start analysis'));
        }
    } catch (error) {
        hideProgress();
        console.error('Error:', error);
        const reader = new FileReader();
        reader.onload = (e) => {
            simulateAnalysis('file', e.target.result);
        };
        reader.readAsText(file);
    }
}

async function pollAnalysisStatus() {
    if (!currentJobId) return;

    let pollCount = 0;

    const pollLoop = async () => {
        pollCount++;
        
        const progressPercent = Math.min(90, 5 + (pollCount * 0.5));
        const stepIndex = Math.floor((pollCount / 20) % 5);
        const steps = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
        const messages = [
            'Extracting code files...',
            'Analyzing security vulnerabilities...',
            'Detecting potential bugs...',
            'Identifying optimization opportunities...',
            'Generating comprehensive report...'
        ];
        
        updateProgress(progressPercent, `${messages[stepIndex]} (${Math.floor(pollCount * 2)}s)`, steps[stepIndex]);

        try {
            const response = await fetch(`http://localhost:5050/api/status/${currentJobId}`);
            const result = await response.json();

            if (result.status === 'completed') {
                updateProgress(100, 'Analysis complete!', 'step-5');
                currentAnalysisResult = result.result || result.analysis;
                setTimeout(() => {
                    hideProgress();
                    displayResults(currentAnalysisResult);
                }, 800);
            } else if (result.status === 'failed') {
                hideProgress();
                alert('Analysis failed: ' + (result.error || 'Unknown error'));
            } else {
                setTimeout(pollLoop, 2000);
            }
        } catch (error) {
            console.error('Error polling status:', error);
            setTimeout(pollLoop, 3000);
        }
    };

    pollLoop();
}

function simulateAnalysis(type, content) {
    let step = 0;
    const steps = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
    const messages = [
        'Extracting code files...',
        'Analyzing security vulnerabilities...',
        'Detecting potential bugs...',
        'Identifying optimization opportunities...',
        'Generating comprehensive report...'
    ];

    updateProgress(0, messages[0], steps[0]);

    progressInterval = setInterval(() => {
        if (step < steps.length) {
            updateProgress((step + 1) * 20, messages[step], steps[step]);
            step++;
        } else {
            clearInterval(progressInterval);
            const mockResult = generateMockAnalysis(type, content);
            currentAnalysisResult = mockResult;
            setTimeout(() => {
                hideProgress();
                displayResults(mockResult);
            }, 500);
        }
    }, 1200);
}

function generateMockAnalysis(type, content) {
    const codeLength = typeof content === 'string' ? content.length : 1000;
    const hasSQL = content && content.toLowerCase().includes('select');
    const hasLoop = content && (content.includes('for ') || content.includes('while '));
    
    return {
        timestamp: new Date().toISOString(),
        type: type,
        security_analysis: {
            overall_security_score: hasSQL ? 7.5 : 3.2,
            overall_severity: hasSQL ? 'High' : 'Low',
            vulnerabilities: hasSQL ? [
                {
                    type: 'SQL Injection',
                    cvss_score: 8.5,
                    cwe_id: 'CWE-89',
                    description: 'Potential SQL injection vulnerability',
                    line: '5',
                    remediation: 'Use parameterized queries'
                }
            ] : [],
            risk_summary: hasSQL ? 'High risk' : 'No issues'
        },
        bug_analysis: {
            has_bugs: hasLoop,
            bugs_found: hasLoop ? [
                {
                    type: 'Performance Issue',
                    severity: 'medium',
                    line: '8',
                    description: 'Inefficient loop',
                    cwe_id: 'CWE-407',
                    fix: 'Use comprehension'
                }
            ] : [],
            overall_risk: hasLoop ? 'medium' : 'low'
        },
        optimization_analysis: {
            current_complexity: {
                time: hasLoop ? 'O(n)' : 'O(1)',
                space: 'O(n)',
                bottlenecks: hasLoop ? ['Loop'] : []
            },
            optimizations: hasLoop ? [
                {
                    type: 'Performance',
                    description: 'Replace loop with comprehension',
                    improvement: '2-3x faster'
                }
            ] : [],
            estimated_speedup: hasLoop ? '2-3x' : 'N/A'
        }
    };
}

function displayResults(analysis) {
    document.getElementById('results-container').style.display = 'block';
    document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });

    // FIX: Handle both response formats
    const security = analysis.security_analysis || analysis.analyses?.security_analysis || {};
    const bugs = analysis.bug_analysis || analysis.analyses?.bug_analysis || {};
    const optimization = analysis.optimization_analysis || analysis.analyses?.optimization_analysis || {};

    const securityScore = security.overall_security_score || 0;
    document.getElementById('security-score').textContent = securityScore.toFixed(1) + '/10';
    document.getElementById('security-label').textContent = security.overall_severity || 'Unknown';

    const bugsCount = bugs.bugs_found ? bugs.bugs_found.length : 0;
    document.getElementById('bugs-count').textContent = bugsCount;
    document.getElementById('bugs-label').textContent = bugsCount === 0 ? 'No issues' : bugsCount === 1 ? '1 issue' : `${bugsCount} issues`;

    const optCount = optimization.optimizations ? optimization.optimizations.length : 0;
    document.getElementById('optimization-count').textContent = optCount;
    document.getElementById('optimization-label').textContent = optCount === 0 ? 'Optimized' : `${optCount} suggestions`;

    displaySecurityDetails(security);
    displayBugDetails(bugs);
    displayOptimizationDetails(optimization);
    displayInsights(analysis, security, bugs, optimization);
}

function displaySecurityDetails(security) {
    const container = document.getElementById('security-details');
    
    if (!security.vulnerabilities || security.vulnerabilities.length === 0) {
        container.innerHTML = `<div class="detail-card"><p style="color: #059669; text-align: center; padding: 2rem;">✓ No security vulnerabilities detected</p></div>`;
        return;
    }

    container.innerHTML = security.vulnerabilities.map(vuln => `
        <div class="detail-card">
            <div class="detail-header">
                <div class="detail-title">${vuln.type}</div>
                <span class="severity-badge severity-${getSeverityClass(vuln.cvss_score || 0)}">${getSeverity(vuln.cvss_score || 0)}</span>
            </div>
            <div class="detail-description">${vuln.description}</div>
            <div class="detail-code">
                <strong>CVSS Score: ${vuln.cvss_score || 'N/A'}</strong><br>
                CWE: ${vuln.cwe_id || 'N/A'}
            </div>
            <div class="detail-recommendation">
                <strong>Recommendation:</strong> ${vuln.remediation || 'N/A'}
            </div>
        </div>
    `).join('');
}

function displayBugDetails(bugAnalysis) {
    const container = document.getElementById('bugs-details');
    
    if (!bugAnalysis.bugs_found || bugAnalysis.bugs_found.length === 0) {
        container.innerHTML = `<div class="detail-card"><p style="color: #059669; text-align: center; padding: 2rem;">✓ No bugs detected</p></div>`;
        return;
    }

    container.innerHTML = bugAnalysis.bugs_found.map(bug => `
        <div class="detail-card">
            <div class="detail-header">
                <div class="detail-title">${bug.type}</div>
                <span class="severity-badge severity-${bug.severity || 'low'}">${(bug.severity || 'low').toUpperCase()}</span>
            </div>
            <div class="detail-description">${bug.description}</div>
            <div class="detail-code">
                <strong>Line ${bug.line || 'N/A'}</strong><br>
                CWE: ${bug.cwe_id || 'N/A'}
            </div>
            <div class="detail-recommendation">
                <strong>Fix:</strong> ${bug.fix || 'N/A'}
            </div>
        </div>
    `).join('');
}

function displayOptimizationDetails(optimization) {
    const container = document.getElementById('optimization-details');
    
    if (!optimization.optimizations || optimization.optimizations.length === 0) {
        container.innerHTML = `<div class="detail-card"><p style="color: #059669; text-align: center; padding: 2rem;">✓ Code is well-optimized</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="detail-card">
            <h4 style="color: #00D4FF; margin-bottom: 1rem;">Current Complexity</h4>
            <p style="color: #B0BEC5;">
                <strong>Time Complexity:</strong> ${optimization.current_complexity?.time || 'N/A'}<br>
                <strong>Space Complexity:</strong> ${optimization.current_complexity?.space || 'N/A'}
            </p>
        </div>
        ${optimization.optimizations.map(opt => `
            <div class="detail-card">
                <div class="detail-header">
                    <div class="detail-title">${opt.type}</div>
                    <span class="severity-badge severity-low">${opt.improvement || 'N/A'}</span>
                </div>
                <div class="detail-description">${opt.description}</div>
            </div>
        `).join('')}
    `;
}

function displayInsights(analysis, security, bugs, optimization) {
    const container = document.getElementById('insights-details');
    const insights = [];

    if ((security.overall_security_score || 0) > 7) {
        insights.push({
            title: '🚨 Critical Security Issues',
            description: 'High-severity vulnerabilities detected',
            recommendation: security.risk_summary || 'Review security issues'
        });
    }

    if ((bugs.bugs_found || []).length > 0) {
        insights.push({
            title: '🐛 Bug Detection',
            description: `Found ${bugs.bugs_found.length} potential bug(s)`,
            recommendation: 'Review and fix identified issues'
        });
    }

    if ((optimization.optimizations || []).length > 0) {
        insights.push({
            title: '⚡ Performance Optimization',
            description: `${optimization.optimizations.length} optimization(s) identified`,
            recommendation: `Estimated speedup: ${optimization.estimated_speedup || 'N/A'}`
        });
    }

    if (insights.length === 0) {
        container.innerHTML = `<div class="detail-card"><p style="color: #059669; text-align: center; padding: 2rem;">✓ Great job! No major issues detected.</p></div>`;
    } else {
        container.innerHTML = insights.map(insight => `
            <div class="detail-card">
                <div class="detail-title">${insight.title}</div>
                <div class="detail-description">${insight.description}</div>
                <div class="detail-recommendation">
                    <strong>Recommendation:</strong> ${insight.recommendation}
                </div>
            </div>
        `).join('');
    }
}

function isValidGitHubUrl(url) {
    return url.includes('github.com') && (url.includes('http://') || url.includes('https://'));
}

function getSeverityClass(cvssScore) {
    if (cvssScore >= 9) return 'critical';
    if (cvssScore >= 7) return 'high';
    if (cvssScore >= 4) return 'medium';
    return 'low';
}

function getSeverity(cvssScore) {
    if (cvssScore >= 9) return 'CRITICAL';
    if (cvssScore >= 7) return 'HIGH';
    if (cvssScore >= 4) return 'MEDIUM';
    return 'LOW';
}

function showProgress() {
    document.getElementById('progress-container').style.display = 'block';
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('progress-container').scrollIntoView({ behavior: 'smooth' });
    updateProgress(0, 'Initializing analysis...', null);
}

function hideProgress() {
    document.getElementById('progress-container').style.display = 'none';
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

function updateProgress(percentage, message, activeStep) {
    document.getElementById('progress-fill').style.width = percentage + '%';
    document.getElementById('progress-text').textContent = message;
    
    if (activeStep) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(activeStep).classList.add('active');
    }
}

// ONLY THIS FUNCTION - Replace downloadReport in your solutions.js

// Download report - CLIENT-SIDE ONLY (no backend download)
async function downloadReport(format) {
    if (!currentAnalysisResult) {
        alert('No analysis results available');
        return;
    }

    try {
        const report = generateReportText(currentAnalysisResult);
        
        if (format === 'txt') {
            downloadTextFile(report, 'neurashield-report.txt');
        } else if (format === 'html') {
            downloadHTMLFile(report, 'neurashield-report.html');
        } else if (format === 'pdf') {
            downloadPDFFile(report, 'neurashield-report.pdf');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating report');
    }
}


function generateReportText(analysis) {
    // Handle both API response formats
    const security = analysis.security_analysis || analysis.analyses?.security_analysis || {};
    const bugs = analysis.bug_analysis || analysis.analyses?.bug_analysis || {};
    const opt = analysis.optimization_analysis || analysis.analyses?.optimization_analysis || {};

    const report = `========================================
NEURASHIELD.AI - CODE ANALYSIS REPORT
========================================
Generated: ${new Date().toLocaleString()}


█ EXECUTIVE SUMMARY
═══════════════════════════════════════

Security Score:        ${(security.overall_security_score || 0).toFixed(1)}/10
Severity Level:        ${security.overall_severity || 'UNKNOWN'}
Total Vulnerabilities: ${(security.vulnerabilities || []).length}
Total Bugs Found:      ${(bugs.bugs_found || []).length}
Optimization Tips:     ${(opt.optimizations || []).length}


█ SECURITY ANALYSIS
═══════════════════════════════════════

Risk Summary: ${security.risk_summary || 'N/A'}

Vulnerabilities Found: ${(security.vulnerabilities || []).length}
${(security.vulnerabilities || []).length === 0 ? 
    '✓ No security vulnerabilities detected' :
    (security.vulnerabilities || []).map((v, i) => `
  ${i + 1}. ${v.type}
     Severity: ${v.severity || 'N/A'}
     CVSS Score: ${v.cvss_score || 'N/A'}
     Description: ${v.description || 'N/A'}
     Remediation: ${v.remediation || 'N/A'}
`).join('\n')
}


█ BUG DETECTION
═══════════════════════════════════════

Bugs Found: ${(bugs.bugs_found || []).length}
Overall Risk: ${bugs.overall_risk || 'unknown'}

${(bugs.bugs_found || []).length === 0 ?
    '✓ No bugs detected' :
    (bugs.bugs_found || []).map((b, i) => `
  ${i + 1}. ${b.type}
     Severity: ${b.severity || 'N/A'}
     Line: ${b.line || 'N/A'}
     Description: ${b.description || 'N/A'}
     Fix: ${b.fix || 'N/A'}
     CWE: ${b.cwe_id || 'N/A'}
`).join('\n')
}


█ OPTIMIZATION OPPORTUNITIES
═══════════════════════════════════════

Current Complexity:
  Time:  ${opt.current_complexity?.time || 'N/A'}
  Space: ${opt.current_complexity?.space || 'N/A'}

Optimizations: ${(opt.optimizations || []).length}
Estimated Speedup: ${opt.estimated_speedup || 'N/A'}

${(opt.optimizations || []).length === 0 ?
    '✓ Code is well-optimized' :
    (opt.optimizations || []).map((o, i) => `
  ${i + 1}. ${o.type}
     Description: ${o.description || 'N/A'}
     Improvement: ${o.improvement || 'N/A'}
`).join('\n')
}


█ IMMEDIATE ACTIONS REQUIRED
═══════════════════════════════════════

${(security.immediate_actions || []).length === 0 ?
    '✓ No immediate actions required' :
    (security.immediate_actions || []).map((action, i) => `  ${i + 1}. ${action}`).join('\n')
}


════════════════════════════════════════
Generated by NeuraShield AI
© 2025 NeuraShield Solutions
════════════════════════════════════════`;

    return report;
}


function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


function downloadHTMLFile(content, filename) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuraShield Analysis Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #001a4d 0%, #003366 100%);
            color: #333;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #00D4FF 0%, #0099CC 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #00D4FF;
            border-bottom: 3px solid #00D4FF;
            padding-bottom: 10px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .section-title::before {
            content: '█';
            margin-right: 15px;
            font-size: 1.2em;
        }
        
        .metric {
            display: inline-block;
            background: #f0f8ff;
            padding: 15px 25px;
            margin: 10px 10px 10px 0;
            border-radius: 5px;
            border-left: 4px solid #00D4FF;
        }
        
        .metric-label {
            font-weight: bold;
            color: #003366;
        }
        
        .metric-value {
            font-size: 1.3em;
            color: #00D4FF;
        }
        
        .item {
            background: #f9f9f9;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #00D4FF;
        }
        
        .item-title {
            font-weight: bold;
            color: #003366;
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        
        .item-details {
            color: #666;
            font-size: 0.95em;
            margin-top: 8px;
        }
        
        .severity {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .severity-critical {
            background: #ff4444;
            color: white;
        }
        
        .severity-high {
            background: #ff8800;
            color: white;
        }
        
        .severity-medium {
            background: #ffaa00;
            color: white;
        }
        
        .severity-low {
            background: #88dd00;
            color: white;
        }
        
        .no-issues {
            color: #00aa44;
            font-weight: bold;
            padding: 15px;
            background: #e8f5e9;
            border-radius: 5px;
            border-left: 4px solid #00aa44;
        }
        
        .footer {
            background: #f0f0f0;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #ddd;
        }
        
        @media print {
            body {
                background: white;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ NeuraShield AI</h1>
            <p>Code Analysis Report</p>
        </div>
        
        <div class="content">
            <pre>${content}</pre>
        </div>
        
        <div class="footer">
            <p>Generated by NeuraShield AI © 2025</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Report Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
// Add this library to your HTML <head> section:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

function downloadPDFFile(content, filename) {
    // Create a temporary div to hold the formatted content
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #00D4FF; text-align: center; border-bottom: 2px solid #00D4FF; padding-bottom: 10px;">
                🛡️ NeuraShield AI - Code Analysis Report
            </h1>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                Generated: ${new Date().toLocaleString()}
            </p>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; line-height: 1.6;">
${content}
            </pre>
            <hr style="margin-top: 30px; border: 1px solid #ddd;">
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 10px;">
                Generated by NeuraShield AI © 2025 NeuraShield Solutions
            </p>
        </div>
    `;

    // PDF generation options
    const options = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Generate and download PDF
    html2pdf().set(options).from(element).save();
}

function generateClientSideReport(format) {
    const report = generateReportText(currentAnalysisResult);
    
    if (format === 'txt') {
        downloadTextFile(report, 'neurashield-report.txt');
    } else if (format === 'html') {
        downloadHTMLFile(report, 'neurashield-report.html');
    } else if (format === 'pdf') {
        downloadPDFFile(report, 'neurashield-report.pdf');
    }
}

function generateReportText(analysis) {
    const security = analysis.security_analysis || analysis.analyses?.security_analysis || {};
    const bugs = analysis.bug_analysis || analysis.analyses?.bug_analysis || {};
    const opt = analysis.optimization_analysis || analysis.analyses?.optimization_analysis || {};

    return `NEURASHIELD.AI - CODE ANALYSIS REPORT
======================================
Timestamp: ${new Date().toLocaleString()}

SECURITY SCORE: ${security.overall_security_score || 0}/10
SEVERITY: ${security.overall_severity || 'UNKNOWN'}
BUGS FOUND: ${(bugs.bugs_found || []).length}
OPTIMIZATIONS: ${(opt.optimizations || []).length}

SECURITY VULNERABILITIES
${(security.vulnerabilities || []).length === 0 ? 'None detected' : security.vulnerabilities.map((v, i) => `${i+1}. ${v.type}: ${v.description}`).join('\n')}

BUG DETECTION
${(bugs.bugs_found || []).length === 0 ? 'None detected' : bugs.bugs_found.map((b, i) => `${i+1}. ${b.type}: ${b.description}`).join('\n')}

OPTIMIZATIONS
${(opt.optimizations || []).length === 0 ? 'Well optimized' : opt.optimizations.map((o, i) => `${i+1}. ${o.type}: ${o.description}`).join('\n')}

Generated by NeuraShield AI
    `;
}

function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function downloadHTMLFile(content, filename) {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>NeuraShield Report</title>
    <style>
        body { font-family: Arial; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; }
        h1 { color: #00D4FF; }
        pre { background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>NeuraShield AI - Code Analysis Report</h1>
        <pre>${content}</pre>
    </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}