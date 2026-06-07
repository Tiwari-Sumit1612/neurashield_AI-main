# NEURASHIELD-AI: CI/CD AND WEBSECOPS AUTOMATION

<img width="1277" height="60" alt="image" src="https://github.com/user-attachments/assets/c43e6992-08c5-4dd1-b5c4-a307fc9b7e3d" />

<h1>Description</h1>
NeuraShield AI is an intelligent, AI-powered code security and quality analysis platform designed to cover the entire software development lifecycle—from local experimentation to enterprise CI/CD pipelines. Built using a Retrieval-Augmented Generation (RAG) architecture, the system combines semantic code embeddings, vector similarity search, and advanced LLM reasoning to detect security vulnerabilities, bugs, and performance bottlenecks with high accuracy. The platform leverages Python AST parsing, OpenAI embeddings, ChromaDB vector storage, and GPT-4o to provide grounded, context-aware analysis rather than rule-based or generic recommendations. Its modular architecture (Phase 1 ingestion + Phase 2 analysis) ensures scalability, reliability, and cost-efficient operation.
<p></p>
The first business model focuses on CI/CD and DevOps automation through a reusable GitHub Actions workflow. Developers can integrate NeuraShield AI directly into their repositories, enabling automated security scans on every push or pull request without additional infrastructure. The pipeline extracts and preprocesses code, generates semantic embeddings, retrieves similar vulnerability patterns from a vector database, and performs RAG-based analysis using GPT-4o. Results are automatically posted as pull request comments, complete with CVSS scores, CWE classifications, exploit difficulty, and remediation steps, along with optional email notifications. This model is designed for teams and enterprises seeking consistent, hands-free security enforcement within existing DevOps workflows.
<p></p>
The second business model is an interactive web-based code analysis platform aimed at individual developers and teams who want real-time feedback before deployment. Through a Flask-based API and a lightweight frontend built with HTML, CSS, and vanilla JavaScript, users can paste code, upload files, or analyze full GitHub repositories. The platform provides live progress tracking, visual dashboards, downloadable reports, and detailed insights across security, bug detection, and optimization categories. This model emphasizes learning, experimentation, and early risk detection, allowing developers to understand enterprise-grade security practices in an accessible, on-demand environment.
<h1>Preview</h1>
Interactive Web-Based Code Analysis Platform<p></p>



https://github.com/user-attachments/assets/4232bb54-b018-4017-be60-1f14545ca1d3


<p></p>
Reusable GitHub Actions workflow
<p></p>
<img width="1024" height="640" alt="image" src="https://github.com/user-attachments/assets/6327428a-7382-4291-bce7-09dde6cb9a54" />
<img width="1024" height="640" alt="image" src="https://github.com/user-attachments/assets/6a9630a0-8dbc-43c2-b42c-81d06fb0ba75" />
<img width="1024" height="640" alt="image" src="https://github.com/user-attachments/assets/8a3a8969-2a9b-4a1d-92f6-96e37d046a92" />
<img width="1024" height="640" alt="image" src="https://github.com/user-attachments/assets/715d2b40-9d4c-4377-8691-c3434547114a" />
<img width="1024" height="640" alt="image" src="https://github.com/user-attachments/assets/562ad2b7-edf5-4a74-8eb4-5268fd2ad2a7" />
<h1>Report Generated</h1>

 - Security Analysis JSON Report
A machine-readable report containing structured vulnerability data, CVSS scores, CWE mappings, risk summaries, and remediation steps, designed for CI/CD automation and further programmatic processing

 - HTML Analysis Report
A human-friendly, visually structured report that summarizes security severity, detected bugs, and optimization suggestions, ideal for quick reviews by developers and managers 

 - PDF Analysis Report
A portable, shareable version of the complete analysis suitable for audits, compliance documentation, and stakeholder reporting, preserving all findings in a formal format

[neurashield-report.pdf](https://github.com/user-attachments/files/25186886/neurashield-report.pdf)

<h1>Contributing/Running the project locally</h1>
<a href="https://github.com/AaryaSoni-web/neurashield_AI/blob/main/README.md">Neurashield_AI</a>
