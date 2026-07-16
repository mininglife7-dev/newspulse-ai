# GOVERNOR PLUG-IN SDK
**Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## EXECUTIVE SUMMARY

The Governor Plug-in SDK enables developers to create new modules that extend Governor's capabilities. This document specifies the module interface, development requirements, testing standards, and deployment procedures.

**Goal:** Make it easy to add new integrations while maintaining security and reliability standards.

---

## MODULE INTERFACE

Every Governor module implements this standard interface:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from datetime import datetime

class Module(ABC):
    """Standard interface all Governor modules must implement"""
    
    # ========== MODULE METADATA ==========
    
    name: str
    """Unique module identifier (lowercase, no spaces)"""
    
    version: str
    """Semantic version (e.g., "1.0.0")"""
    
    description: str
    """One-line description of what this module does"""
    
    author: str
    """Developer name"""
    
    dependencies: List[str]
    """External tools/packages required"""
    
    permissions: List[str]
    """Permissions this module needs (e.g., "repo:write", "db:modify")"""
    
    capabilities: List[Capability]
    """List of actions this module can perform"""
    
    # ========== LIFECYCLE METHODS ==========
    
    async def init(self) -> bool:
        """
        Initialize module, verify dependencies, check credentials.
        
        Return:
            True if ready to operate, False if initialization failed
        """
        pass
    
    async def health_check(self) -> HealthStatus:
        """
        Verify module is healthy and ready to execute.
        
        Return:
            HealthStatus with status ("healthy", "degraded", "down")
            and details (dict with diagnostic info)
        """
        pass
    
    async def shutdown(self) -> None:
        """Clean up resources, close connections, etc."""
        pass
    
    # ========== EXECUTION ==========
    
    async def execute(self, task: Task) -> Result:
        """
        Execute a task using this module.
        
        Args:
            task: Task object with action, parameters, context
        
        Return:
            Result object with status, output, errors, evidence
        """
        pass
    
    # ========== CAPABILITIES ==========
    
    async def list_capabilities(self) -> List[Capability]:
        """List all capabilities this module provides"""
        return self.capabilities
    
    async def get_capability(self, name: str) -> Optional[Capability]:
        """Get details of a specific capability"""
        for cap in self.capabilities:
            if cap.name == name:
                return cap
        return None
    
    # ========== OBSERVABILITY ==========
    
    async def get_metrics(self) -> Dict:
        """
        Return performance metrics.
        
        Return:
            Dict with keys: operations_completed, operations_failed,
                            avg_duration_ms, error_rate
        """
        pass
    
    async def get_logs(self, limit: int = 100) -> List[Dict]:
        """Get recent operation logs"""
        pass
    
    async def get_status(self) -> Dict:
        """Get current module status"""
        return {
            "name": self.name,
            "version": self.version,
            "initialized": True,  # or False
            "health": await self.health_check(),
            "metrics": await self.get_metrics()
        }
    
    # ========== CONFIGURATION ==========
    
    async def set_config(self, key: str, value: any) -> None:
        """Update module configuration"""
        pass
    
    async def get_config(self) -> Dict:
        """Get current configuration"""
        pass
    
    async def validate_config(self) -> (bool, str):
        """Validate configuration is correct"""
        pass
```

---

## DATA STRUCTURES

### Capability

```python
class Capability:
    name: str                    # Unique within module
    description: str             # What it does
    input_schema: Dict           # JSON schema for inputs
    output_schema: Dict          # JSON schema for outputs
    permissions_required: List[str]  # Permissions needed
    idempotent: bool            # Safe to run multiple times?
    async_supported: bool       # Can run async?
    timeout_seconds: int        # How long can it take?
    cost: float                 # Approximate cost (dollars)
    examples: List[Dict]        # Example usage
```

### Task

```python
class Task:
    id: str                     # Unique task ID
    action: str                 # Action to perform
    parameters: Dict            # Action parameters
    context: Dict               # Execution context
    timeout_seconds: int        # Max execution time
    retry_count: int           # Max retries on failure
    approval_id: Optional[str]  # If escalation approval
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
```

### Result

```python
class Result:
    status: str                 # "success", "failure", "partial"
    output: any                 # Operation result
    error: Optional[str]        # Error message if failed
    duration_ms: int            # Execution time
    evidence: List[Dict]        # Verification evidence
    logs: List[str]             # Operation logs
    cost: float                 # Actual cost incurred
    timestamp: datetime
```

### HealthStatus

```python
class HealthStatus:
    status: str                 # "healthy", "degraded", "down"
    message: str                # Human-readable status
    details: Dict               # Diagnostic details
    last_check: datetime
    next_check: datetime
```

---

## DEVELOPMENT WORKFLOW

### Step 1: Create Module Structure

```
modules/my_module/
├── __init__.py
├── module.py            # Main module implementation
├── capabilities.py      # Capability definitions
├── config.py           # Configuration schema
├── requirements.txt    # Python dependencies
├── Dockerfile          # If using containerized tools
└── tests/
    ├── __init__.py
    ├── test_module.py
    ├── test_capabilities.py
    └── fixtures/       # Test data
```

### Step 2: Implement Module Class

```python
# modules/my_module/module.py

from governor import Module, Task, Result, HealthStatus
import logging

logger = logging.getLogger(__name__)

class MyModule(Module):
    name = "my_module"
    version = "1.0.0"
    description = "Integrate with MyService API"
    author = "Your Name"
    
    dependencies = ["requests>=2.28.0"]
    permissions = ["external_api:read", "logging:write"]
    
    def __init__(self):
        self.initialized = False
        self.api_client = None
        self.config = {}
    
    async def init(self) -> bool:
        """Initialize module"""
        try:
            # Load configuration
            self.config = await self.load_config()
            
            # Verify API token available
            api_token = await self.get_secret("api_token")
            if not api_token:
                logger.error("API token not configured")
                return False
            
            # Initialize API client
            self.api_client = MyServiceClient(api_token)
            
            # Test connectivity
            if not await self.api_client.test_connection():
                logger.error("Cannot connect to MyService")
                return False
            
            self.initialized = True
            logger.info(f"{self.name} initialized successfully")
            return True
        
        except Exception as e:
            logger.error(f"Failed to initialize: {e}")
            return False
    
    async def health_check(self) -> HealthStatus:
        """Check module health"""
        if not self.initialized or not self.api_client:
            return HealthStatus(
                status="down",
                message="Module not initialized",
                details={}
            )
        
        try:
            is_healthy = await self.api_client.test_connection()
            status = "healthy" if is_healthy else "degraded"
            
            return HealthStatus(
                status=status,
                message=f"API connection {status}",
                details={"api_reachable": is_healthy}
            )
        except Exception as e:
            return HealthStatus(
                status="down",
                message=f"Error during health check: {e}",
                details={"error": str(e)}
            )
    
    async def execute(self, task: Task) -> Result:
        """Execute task"""
        try:
            # Verify capability exists
            capability = await self.get_capability(task.action)
            if not capability:
                return Result(
                    status="failure",
                    error=f"Unknown action: {task.action}"
                )
            
            # Verify permissions
            if not await self.check_permissions(capability.permissions_required):
                return Result(
                    status="failure",
                    error="Insufficient permissions"
                )
            
            # Execute with timeout
            import asyncio
            start = time.time()
            
            result_data = await asyncio.wait_for(
                self._execute_action(task),
                timeout=capability.timeout_seconds
            )
            
            duration_ms = (time.time() - start) * 1000
            
            return Result(
                status="success",
                output=result_data,
                duration_ms=int(duration_ms),
                evidence=await self.collect_evidence(task, result_data)
            )
        
        except asyncio.TimeoutError:
            return Result(
                status="failure",
                error=f"Operation timed out after {capability.timeout_seconds}s"
            )
        except Exception as e:
            return Result(
                status="failure",
                error=f"Execution error: {e}"
            )
    
    async def _execute_action(self, task: Task):
        """Implementation of specific actions"""
        action = task.action
        params = task.parameters
        
        if action == "fetch_data":
            return await self.api_client.fetch(params["resource_id"])
        elif action == "create_resource":
            return await self.api_client.create(params)
        else:
            raise ValueError(f"Unknown action: {action}")
```

### Step 3: Define Capabilities

```python
# modules/my_module/capabilities.py

from governor import Capability

CAPABILITIES = [
    Capability(
        name="fetch_data",
        description="Fetch data from MyService",
        input_schema={
            "type": "object",
            "properties": {
                "resource_id": {"type": "string"},
                "format": {"type": "string", "enum": ["json", "csv"]}
            },
            "required": ["resource_id"]
        },
        output_schema={
            "type": "object",
            "properties": {
                "data": {"type": "object"},
                "fetched_at": {"type": "string"}
            }
        },
        permissions_required=["external_api:read"],
        idempotent=True,
        async_supported=True,
        timeout_seconds=30,
        cost=0.0,
        examples=[
            {
                "input": {"resource_id": "123"},
                "output": {"data": {...}, "fetched_at": "2026-07-16T..."}
            }
        ]
    ),
    # ... more capabilities
]
```

### Step 4: Write Tests

```python
# modules/my_module/tests/test_module.py

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from my_module.module import MyModule
from governor import Task, Result

@pytest.fixture
async def module():
    """Fixture: initialized module"""
    mod = MyModule()
    
    with patch.object(mod, 'load_config', return_value={}):
        with patch.object(mod, 'get_secret', return_value='test-token'):
            with patch.object(mod, 'api_client'):
                mod.api_client.test_connection = AsyncMock(return_value=True)
                initialized = await mod.init()
                assert initialized
    
    yield mod
    await mod.shutdown()

@pytest.mark.asyncio
async def test_fetch_data(module):
    """Test: fetch_data capability"""
    task = Task(
        id="task-1",
        action="fetch_data",
        parameters={"resource_id": "123"},
        context={},
        timeout_seconds=30,
        retry_count=1,
        created_at=datetime.now()
    )
    
    # Mock API response
    module.api_client.fetch = AsyncMock(return_value={"data": "test"})
    
    # Execute
    result = await module.execute(task)
    
    # Verify
    assert result.status == "success"
    assert result.output["data"] == "test"
    assert result.duration_ms > 0
    assert len(result.evidence) > 0

@pytest.mark.asyncio
async def test_health_check(module):
    """Test: health_check"""
    module.api_client.test_connection = AsyncMock(return_value=True)
    health = await module.health_check()
    
    assert health.status == "healthy"
    assert health.details["api_reachable"] is True

@pytest.mark.asyncio
async def test_init_failure(module):
    """Test: init fails gracefully"""
    with patch.object(module, 'get_secret', return_value=None):
        initialized = await module.init()
        assert not initialized
```

---

## SECURITY REQUIREMENTS

### Credential Handling

```python
# ✅ CORRECT: Request secret from vault
async def execute(self, task):
    api_key = await self.get_secret("my_module_api_key")
    # Use api_key...

# ❌ WRONG: Hardcode secret
async def execute(self, task):
    api_key = "sk-12345..."  # NEVER

# ❌ WRONG: Store in code
API_KEY = os.getenv("API_KEY")  # Risky if env var not set

# ✅ CORRECT: Use vault
async def get_secret(self, name: str):
    return await vault.retrieve(name, reason="module_execution")
```

### Permission Checking

```python
# ✅ CORRECT: Check permissions before using
async def execute(self, task):
    if "external_api:write" not in self.permissions:
        raise PermissionError("Cannot modify external resources")
    # Safe to proceed

# ❌ WRONG: No permission check
async def execute(self, task):
    # Just assume we can do anything...
    await modify_external_system()
```

### Logging

```python
# ✅ CORRECT: Log actions without secrets
logger.info(f"Fetching resource {resource_id}")

# ❌ WRONG: Log secrets
logger.info(f"Using API key {api_key}")  # NEVER
logger.debug(f"Response: {response}")     # May contain secrets
```

---

## TESTING STANDARDS

**Minimum Coverage:** 80% code coverage

**Test Categories:**
1. Unit tests (module isolation)
2. Integration tests (with real or mocked services)
3. Security tests (no secrets leaked, permissions enforced)
4. Performance tests (timeout handling, resource usage)

**Running Tests:**
```bash
cd modules/my_module
pytest --cov=. tests/
```

---

## DEPLOYMENT PROCESS

### Step 1: Submit Module

```bash
# Create pull request
git checkout -b modules/my_module
git add modules/my_module/
git commit -m "modules: Add MyModule integration"
git push origin modules/my_module
# Create PR on GitHub
```

### Step 2: Automated Checks

Governor runs:
- ✅ Linting (no style issues)
- ✅ Security scanning (no hardcoded secrets)
- ✅ Test coverage (>80%)
- ✅ Type checking (if TypeScript/Python)
- ✅ Dependency audit (no vulnerable packages)

### Step 3: Code Review

- Founder reviews functionality
- Security engineer reviews permissions/secrets handling
- Governor Architect reviews architecture/design

### Step 4: Approval & Merge

Once approved:
1. Module merged to main
2. Automatically packaged
3. Deployed to production
4. Monitoring activated

---

## EXAMPLE: SIMPLE HTTP MODULE

```python
# modules/http_module/module.py

class HttpModule(Module):
    name = "http"
    version = "1.0.0"
    description = "HTTP request execution"
    
    async def init(self) -> bool:
        import aiohttp
        self.session = aiohttp.ClientSession()
        return True
    
    async def execute(self, task: Task) -> Result:
        method = task.parameters.get("method", "GET")
        url = task.parameters["url"]
        headers = task.parameters.get("headers", {})
        
        try:
            async with self.session.request(method, url, headers=headers) as resp:
                data = await resp.text()
                return Result(
                    status="success",
                    output={"status": resp.status, "body": data}
                )
        except Exception as e:
            return Result(status="failure", error=str(e))
    
    async def shutdown(self):
        await self.session.close()
```

---

## REFERENCE

**See Also:**
- GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md (Plug-in Model)
- GOVERNOR-SECURITY-MODEL.md (Security requirements)
- GOVERNOR-DEPLOYMENT-GUIDE.md (How to deploy modules)

---

**Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**Maintained by:** Governor Ω
