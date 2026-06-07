"""
NeuraShield Solutions API
Flask backend for code analysis - Updated for Real NeuraShield Integration
FIXED: Proper error handling and timeout handling
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import sys
import json
import uuid
import re
import logging
import time
from datetime import datetime
from pathlib import Path
import tempfile
import threading

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import NeuraShield modules
try:
    from phase_1.code_extractor import GitHubCodeExtractor
    from phase_1.vector_store import ChromaVectorStore
    from phase_1.embedding_generator import EmbeddingGenerator
    from phase_2.rag_analyzer import RAGAnalyzer
    NEURASHIELD_AVAILABLE = True
except ImportError as e:
    NEURASHIELD_AVAILABLE = False
    logger.warning(f"Warning: NeuraShield modules not found: {e}. Running in demo mode.")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
TEMP_FOLDER = os.path.join(PROJECT_ROOT, '.temp_data')
os.makedirs(TEMP_FOLDER, exist_ok=True)

# In-memory job storage
jobs = {}
report_cache = {}
REPORT_CACHE_TIMEOUT = 3600  # 1 hour in seconds

# Initialize NeuraShield components if available
if NEURASHIELD_AVAILABLE:
    try:
        vector_store = ChromaVectorStore(
            collection_name="neurashield_code_v1",
            persist_directory="phase_1/chroma_db"
        )
        embedding_gen = EmbeddingGenerator()
        analyzer = RAGAnalyzer(
            vector_store=vector_store,
            embedding_generator=embedding_gen,
            llm_model="gpt-4o",
            top_k=5
        )
        logger.info("✓ NeuraShield initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing NeuraShield: {e}")
        NEURASHIELD_AVAILABLE = False

def create_job(job_type, input_data):
    """Create a new analysis job"""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        'id': job_id,
        'type': job_type,
        'status': 'pending',
        'created_at': datetime.now().isoformat(),
        'input': input_data,
        'result': None,
        'error': None,
        'progress': 'Queued...'
    }
    return job_id

def update_job(job_id, status, result=None, error=None, progress=None):
    """Update job status"""
    if job_id in jobs:
        jobs[job_id]['status'] = status
        jobs[job_id]['updated_at'] = datetime.now().isoformat()
        if result:
            jobs[job_id]['result'] = result
        if error:
            jobs[job_id]['error'] = error
        if progress:
            jobs[job_id]['progress'] = progress
        logger.info(f"Job {job_id}: {status} - {progress or ''}")

def cleanup_expired_reports():
    """Remove expired reports from cache"""
    current_time = datetime.now().timestamp()
    expired_jobs = [
        job_id for job_id, report in report_cache.items()
        if current_time - report['timestamp'] > REPORT_CACHE_TIMEOUT
    ]
    for job_id in expired_jobs:
        logger.info(f"Cleaning up expired report: {job_id}")
        del report_cache[job_id]
        if job_id in jobs:
            del jobs[job_id]

def generate_fallback_report(error_msg):
    """Generate fallback analysis when analysis fails"""
    logger.warning(f"Generating fallback report due to: {error_msg}")
    
    return {
        'timestamp': datetime.now().isoformat(),
        'type': 'fallback',
        'error': error_msg,
        'security_analysis': {
            'overall_security_score': 5.0,
            'overall_severity': 'UNKNOWN',
            'vulnerabilities': [],
            'risk_summary': f'Analysis unavailable: {error_msg}',
            'immediate_actions': ['Try again later', 'Check API status']
        },
        'bug_analysis': {
            'has_bugs': False,
            'bugs_found': [],
            'overall_risk': 'unknown'
        },
        'optimization_analysis': {
            'current_complexity': {
                'time': 'Unknown',
                'space': 'Unknown',
                'bottlenecks': []
            },
            'optimizations': [],
            'estimated_speedup': 'N/A'
        },
        'code_quality': {
            'score': 0,
            'grade': 'F',
            'issues': 0
        }
    }

def run_analysis(job_id, code, analysis_type='all'):
    """Run code analysis in background thread - NO TIMEOUT"""
    try:
        update_job(job_id, 'processing', progress='Starting analysis...')
        logger.info(f"[{job_id}] Starting analysis")
        
        if NEURASHIELD_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            try:
                update_job(job_id, 'processing', progress='Building RAG context...')
                logger.info(f"[{job_id}] Building RAG context...")
                
                # Real analysis - NO TIMEOUT
                start_time = time.time()
                
                try:
                    update_job(job_id, 'processing', progress='Analyzing code...')
                    raw_results = analyzer.analyze_code(
                        code=code,
                        analysis_type=analysis_type
                    )
                    
                    elapsed = time.time() - start_time
                    logger.info(f"[{job_id}] Analysis completed in {elapsed:.2f}s")
                    
                except Exception as analysis_error:
                    elapsed = time.time() - start_time
                    error_msg = str(analysis_error)
                    logger.error(f"[{job_id}] Analysis error after {elapsed:.2f}s: {error_msg}")
                    
                    # Return fallback report
                    fallback = generate_fallback_report(error_msg)
                    update_job(job_id, 'completed', result=fallback, progress='Analysis failed - showing fallback')
                    
                    report_cache[job_id] = {
                        'content': json.dumps(fallback, indent=2),
                        'timestamp': datetime.now().timestamp()
                    }
                    return
                
                # Ensure result is valid
                if not raw_results or (isinstance(raw_results, dict) and raw_results.get('error')):
                    error_msg = raw_results.get('message', 'Unknown analysis error') if isinstance(raw_results, dict) else 'Invalid analysis result'
                    logger.warning(f"[{job_id}] Analysis returned error: {error_msg}")
                    
                    fallback = generate_fallback_report(error_msg)
                    update_job(job_id, 'completed', result=fallback, progress='Analysis error - showing fallback')
                    
                    report_cache[job_id] = {
                        'content': json.dumps(fallback, indent=2),
                        'timestamp': datetime.now().timestamp()
                    }
                    return
                
                # Success
                update_job(job_id, 'completed', result=raw_results, progress='Analysis complete')
                report_cache[job_id] = {
                    'content': json.dumps(raw_results, indent=2),
                    'timestamp': datetime.now().timestamp()
                }
                logger.info(f"[{job_id}] ✓ Analysis completed successfully")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"[{job_id}] Unexpected error: {error_msg}")
                
                fallback = generate_fallback_report(error_msg)
                update_job(job_id, 'completed', result=fallback, progress='Error - showing fallback')
                
                report_cache[job_id] = {
                    'content': json.dumps(fallback, indent=2),
                    'timestamp': datetime.now().timestamp()
                }
        else:
            # Demo mode
            logger.info(f"[{job_id}] Running in demo mode...")
            update_job(job_id, 'processing', progress='Demo analysis...')
            time.sleep(2)  # Simulate processing
            
            demo_result = {
                'timestamp': datetime.now().isoformat(),
                'type': 'demo',
                'security_analysis': {
                    'overall_security_score': 6.5,
                    'overall_severity': 'HIGH',
                    'vulnerabilities': [
                        {
                            'type': 'Demo Vulnerability',
                            'cvss_score': 6.5,
                            'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
                            'cwe_id': 'CWE-200',
                            'remediation': 'This is a demo result'
                        }
                    ],
                    'risk_summary': 'Demo mode - limited analysis',
                    'immediate_actions': []
                },
                'bug_analysis': {
                    'has_bugs': False,
                    'bugs_found': [],
                    'overall_risk': 'low'
                },
                'optimization_analysis': {
                    'current_complexity': {
                        'time': 'O(n)',
                        'space': 'O(1)',
                        'bottlenecks': []
                    },
                    'optimizations': [],
                    'estimated_speedup': 'N/A'
                },
                'code_quality': {
                    'score': 70,
                    'grade': 'C',
                    'issues': 1
                }
            }
            
            update_job(job_id, 'completed', result=demo_result, progress='Demo complete')
            report_cache[job_id] = {
                'content': json.dumps(demo_result, indent=2),
                'timestamp': datetime.now().timestamp()
            }
            logger.info(f"[{job_id}] ✓ Demo analysis completed")
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{job_id}] Fatal error: {error_msg}")
        
        fallback = generate_fallback_report(f"Fatal error: {error_msg}")
        update_job(job_id, 'failed', error=error_msg, result=fallback)

# REST API Routes

@app.route('/')
def index():
    """API root"""
    cleanup_expired_reports()
    return jsonify({
        'message': 'NeuraShield Solutions API',
        'version': '2.0.0',
        'status': 'running',
        'neurashield_enabled': NEURASHIELD_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/api/analyze/code', methods=['POST'])
def analyze_code():
    """Analyze pasted code - Non-blocking, returns immediately"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid JSON request'}), 400
        
        code = data.get('code', '').strip()
        
        if not code:
            return jsonify({'error': 'Code is required and cannot be empty'}), 400
        
        if len(code) > 100000:
            return jsonify({'error': 'Code too large (max 100KB)'}), 413
        
        # Create job
        job_id = create_job('code', {'code': code[:500] + '...' if len(code) > 500 else code})
        logger.info(f"New job created: {job_id}")
        
        # Start analysis in background thread
        thread = threading.Thread(
            target=run_analysis,
            args=(job_id, code, 'all'),
            daemon=True
        )
        thread.start()
        
        # Return immediately with job_id (202 Accepted)
        return jsonify({
            'job_id': job_id,
            'status': 'pending',
            'message': 'Analysis started',
            'poll_url': f'/api/status/{job_id}'
        }), 202
    
    except Exception as e:
        logger.error(f"Error in /api/analyze/code: {str(e)}")
        return jsonify({'error': f'Request error: {str(e)}'}), 400

@app.route('/api/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """Get analysis status - No timeout"""
    try:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        
        response = {
            'job_id': job_id,
            'status': job['status'],
            'created_at': job['created_at'],
            'progress': job.get('progress', ''),
            'updated_at': job.get('updated_at', job['created_at'])
        }
        
        if job['status'] == 'processing':
            # Calculate elapsed time
            created = datetime.fromisoformat(job['created_at'])
            elapsed = (datetime.now() - created).total_seconds()
            response['elapsed_seconds'] = round(elapsed, 2)
            response['message'] = f"{job.get('progress', 'Processing...')} ({elapsed:.0f}s elapsed)"
            return jsonify(response), 202  # Still processing
        
        elif job['status'] == 'completed':
            response['result'] = job.get('result')
            return jsonify(response), 200  # Done
        
        elif job['status'] == 'failed':
            response['error'] = job.get('error')
            response['result'] = job.get('result')  # Include fallback if available
            return jsonify(response), 200  # Failed
        
        return jsonify(response), 200
    
    except Exception as e:
        logger.error(f"Error in /api/status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/github', methods=['POST'])
def analyze_github():
    """Analyze GitHub repository"""
    try:
        data = request.get_json()
        repo_url = data.get('repo_url', '').strip()
        
        if not repo_url:
            return jsonify({'error': 'Repository URL is required'}), 400
        
        job_id = create_job('github', {'repo_url': repo_url})
        
        def process_repo():
            try:
                update_job(job_id, 'processing', progress='Cloning repository...')
                
                if NEURASHIELD_AVAILABLE:
                    extractor = GitHubCodeExtractor(repo_url)
                    code_files = extractor.extract_python_files()
                    combined_code = '\n\n'.join([f['source_code'] for f in code_files[:5]])
                    extractor.cleanup()
                    run_analysis(job_id, combined_code)
                else:
                    run_analysis(job_id, "# Sample GitHub code\ndef main():\n    pass")
            except Exception as e:
                error_msg = str(e)
                logger.error(f"[{job_id}] GitHub analysis error: {error_msg}")
                fallback = generate_fallback_report(error_msg)
                update_job(job_id, 'failed', error=error_msg, result=fallback)
        
        thread = threading.Thread(target=process_repo, daemon=True)
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'pending',
            'message': 'GitHub analysis started'
        }), 202
    
    except Exception as e:
        logger.error(f"Error in /api/analyze/github: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/analyze/file', methods=['POST'])
def analyze_file():
    """Analyze uploaded file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file content
        try:
            code = file.read().decode('utf-8')
        except Exception as e:
            return jsonify({'error': f'Failed to read file: {str(e)}'}), 400
        
        job_id = create_job('file', {'filename': file.filename})
        thread = threading.Thread(
            target=run_analysis,
            args=(job_id, code, 'all'),
            daemon=True
        )
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'pending',
            'message': 'File analysis started'
        }), 202
    
    except Exception as e:
        logger.error(f"Error in /api/analyze/file: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/download/<job_id>/<format>', methods=['GET'])
def download_report(job_id, format):
    """Download analysis report"""
    try:
        if job_id not in jobs:
            return jsonify({'error': 'Job not found'}), 404
        
        job = jobs[job_id]
        
        if job['status'] != 'completed':
            return jsonify({'error': 'Analysis not completed'}), 400
        
        if job_id not in report_cache:
            return jsonify({'error': 'Report not found'}), 404
        
        # Check expiration
        report_data = report_cache[job_id]
        if datetime.now().timestamp() - report_data['timestamp'] > REPORT_CACHE_TIMEOUT:
            del report_cache[job_id]
            return jsonify({'error': 'Report has expired'}), 404
        
        content = report_data['content']
        
        if format == 'json':
            from io import BytesIO
            buffer = BytesIO(content.encode('utf-8'))
            return send_file(buffer, as_attachment=True,
                           download_name='neurashield-report.json',
                           mimetype='application/json')
        
        elif format == 'txt':
            from io import BytesIO
            buffer = BytesIO(content.encode('utf-8'))
            return send_file(buffer, as_attachment=True,
                           download_name='neurashield-report.txt',
                           mimetype='text/plain')
        
        else:
            return jsonify({'error': 'Invalid format (json or txt)'}), 400
    
    except Exception as e:
        logger.error(f"Error in /api/download: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """List all active jobs"""
    try:
        job_list = [
            {
                'job_id': job_id,
                'type': job['type'],
                'status': job['status'],
                'created_at': job['created_at'],
                'progress': job.get('progress', '')
            }
            for job_id, job in jobs.items()
        ]
        
        return jsonify({
            'total_jobs': len(job_list),
            'jobs': job_list
        }), 200
    
    except Exception as e:
        logger.error(f"Error in /api/jobs: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print(f"""
╔════════════════════════════════════════╗
║  NeuraShield Solutions API Server v2.0 ║
╚════════════════════════════════════════╝

Server: http://localhost:5050
Mode: {'FULL (NeuraShield Enabled)' if NEURASHIELD_AVAILABLE else 'DEMO'}

Endpoints:
  POST   /api/analyze/code          - Submit code for analysis
  POST   /api/analyze/github        - Analyze GitHub repository  
  POST   /api/analyze/file          - Upload file for analysis
  GET    /api/status/<job_id>       - Check analysis progress
  GET    /api/download/<id>/<format>- Download report
  GET    /api/jobs                  - List all jobs

Features:
  ✓ No timeout limits
  ✓ Non-blocking API (202 Accepted)
  ✓ Real-time progress tracking
  ✓ Fallback reports on error
  ✓ Comprehensive logging
  ✓ Background job processing
""")
    
    app.run(debug=True, host='0.0.0.0', port=5050, threaded=True)
