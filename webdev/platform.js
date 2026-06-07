function copyCode() {
const codeElement = document.getElementById('workflow-code');
const codeText = `name: NeuraShield Security Scan

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - '**.py'
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  security-scan:
    uses: AaryaSoni-web/neurashield-ai/.github/workflows/reusable-analysis.yml@main
    with:
      source-repo: \${{ github.repository }}
      pr-number: \${{ github.event.pull_request.number }}
    secrets:
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}`;

// Copy to clipboard
navigator.clipboard.writeText(codeText).then(() => {
// Update button text
const copyBtn = document.querySelector('.copy-btn');
const copyIcon = document.getElementById('copy-icon');
const copyText = document.getElementById('copy-text');

copyBtn.classList.add('copied');
copyIcon.textContent = '✓';
copyText.textContent = 'Copied!';

// Reset after 2 seconds
setTimeout(() => {
copyBtn.classList.remove('copied');
copyIcon.textContent = '📋';
copyText.textContent = 'Copy Code';
}, 2000);
}).catch(err => {
console.error('Failed to copy:', err);
});
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
anchor.addEventListener('click', function (e) {
e.preventDefault();
const target = document.querySelector(this.getAttribute('href'));
if (target) {
target.scrollIntoView({
behavior: 'smooth',
block: 'start'
});
}
});
});
