"""
Backend API Tests for Pipeline Activity and Real-Time Progress Modal
Tests the /api/pipeline/activity endpoint and related pipeline functionality
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestPipelineActivity:
    """Tests for /api/pipeline/activity endpoint"""
    
    def test_get_pipeline_activity(self):
        """Test getting pipeline activity returns activities and counts"""
        response = requests.get(f"{BASE_URL}/api/pipeline/activity", params={"limit": 20})
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "activities" in data
        assert "counts" in data
        assert isinstance(data["activities"], list)
        assert isinstance(data["counts"], dict)
        
        # Verify counts structure
        counts = data["counts"]
        expected_count_keys = ["scraped", "enriched", "researched", "in_sequence"]
        for key in expected_count_keys:
            assert key in counts, f"Missing count key: {key}"
            assert isinstance(counts[key], int), f"Count {key} should be integer"
    
    def test_pipeline_activity_with_limit(self):
        """Test pipeline activity respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/pipeline/activity", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        
        # Should return at most 5 activities
        assert len(data["activities"]) <= 5
    
    def test_pipeline_activity_structure(self):
        """Test activity items have correct structure"""
        response = requests.get(f"{BASE_URL}/api/pipeline/activity", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        
        if len(data["activities"]) > 0:
            activity = data["activities"][0]
            # Verify activity structure
            assert "id" in activity
            assert "type" in activity
            assert "stage" in activity
            assert "message" in activity
            assert "timestamp" in activity
            
            # Verify type is valid
            valid_types = ["success", "error", "warning", "info"]
            assert activity["type"] in valid_types, f"Invalid activity type: {activity['type']}"
            
            # Verify stage is valid
            valid_stages = ["system", "scrape", "enrich", "research", "sequence", "analytics"]
            assert activity["stage"] in valid_stages, f"Invalid stage: {activity['stage']}"


class TestSystemStatus:
    """Tests for /api/system/status endpoint"""
    
    def test_get_system_status(self):
        """Test getting system status"""
        response = requests.get(f"{BASE_URL}/api/system/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "is_running" in data
        assert "test_mode" in data
        assert isinstance(data["is_running"], bool)
        assert isinstance(data["test_mode"], bool)
    
    def test_system_status_has_config(self):
        """Test system status includes config"""
        response = requests.get(f"{BASE_URL}/api/system/status")
        assert response.status_code == 200
        data = response.json()
        
        # Config should be present
        assert "config" in data
        config = data["config"]
        assert "id" in config
        assert config["id"] == "system_config"


class TestProducts:
    """Tests for /api/products endpoint"""
    
    def test_get_products(self):
        """Test getting products list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            product = data[0]
            assert "id" in product
            assert "name" in product
            assert "description" in product


class TestDiscoverySets:
    """Tests for /api/discovery-sets endpoint"""
    
    def test_get_discovery_sets(self):
        """Test getting discovery sets list"""
        response = requests.get(f"{BASE_URL}/api/discovery-sets")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            discovery_set = data[0]
            assert "id" in discovery_set
            assert "name" in discovery_set
            assert "keywords" in discovery_set
            assert "locations" in discovery_set


class TestPipelineStartStop:
    """Tests for pipeline start/stop functionality"""
    
    def test_start_pipeline_test_mode(self):
        """Test starting pipeline in test mode"""
        # First check current status
        status_response = requests.get(f"{BASE_URL}/api/system/status")
        initial_status = status_response.json()
        
        # If already running, stop first
        if initial_status.get("is_running"):
            stop_response = requests.post(f"{BASE_URL}/api/system/stop")
            assert stop_response.status_code == 200
            time.sleep(1)
        
        # Start pipeline in test mode
        response = requests.post(f"{BASE_URL}/api/system/start", params={"test_mode": True})
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "running"
        assert data["test_mode"] == True
        
        # Verify status changed
        time.sleep(1)
        status_response = requests.get(f"{BASE_URL}/api/system/status")
        status = status_response.json()
        assert status["is_running"] == True
    
    def test_stop_pipeline(self):
        """Test stopping pipeline"""
        # First ensure pipeline is running
        status_response = requests.get(f"{BASE_URL}/api/system/status")
        initial_status = status_response.json()
        
        if not initial_status.get("is_running"):
            # Start it first
            start_response = requests.post(f"{BASE_URL}/api/system/start", params={"test_mode": True})
            assert start_response.status_code == 200
            time.sleep(1)
        
        # Stop pipeline
        response = requests.post(f"{BASE_URL}/api/system/stop")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "stopped"
        
        # Verify status changed
        time.sleep(1)
        status_response = requests.get(f"{BASE_URL}/api/system/status")
        status = status_response.json()
        assert status["is_running"] == False
    
    def test_start_with_product_and_discovery_set(self):
        """Test starting pipeline with product and discovery set selection"""
        # Get available products and discovery sets
        products_response = requests.get(f"{BASE_URL}/api/products")
        discovery_sets_response = requests.get(f"{BASE_URL}/api/discovery-sets")
        
        products = products_response.json()
        discovery_sets = discovery_sets_response.json()
        
        # Ensure pipeline is stopped
        stop_response = requests.post(f"{BASE_URL}/api/system/stop")
        time.sleep(1)
        
        # Start with selections if available
        params = {"test_mode": True}
        if len(products) > 0:
            params["product_id"] = products[0]["id"]
        if len(discovery_sets) > 0:
            params["discovery_set_id"] = discovery_sets[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/system/start", params=params)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "running"
        
        # Clean up - stop pipeline
        requests.post(f"{BASE_URL}/api/system/stop")


class TestConfig:
    """Tests for /api/config endpoint"""
    
    def test_get_config(self):
        """Test getting system config"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"] == "system_config"
        assert "daily_outreach_limit" in data
        assert "max_follow_ups" in data


class TestPipelineAnalytics:
    """Tests for /api/pipeline/analytics endpoint"""
    
    def test_get_pipeline_analytics(self):
        """Test getting pipeline analytics"""
        response = requests.get(f"{BASE_URL}/api/pipeline/analytics")
        assert response.status_code == 200
        data = response.json()
        
        # Analytics may be null if not yet computed
        # Just verify the endpoint works
        assert response.status_code == 200


# Cleanup fixture to ensure pipeline is stopped after tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_pipeline():
    """Ensure pipeline is stopped after all tests"""
    yield
    # Stop pipeline after tests
    try:
        requests.post(f"{BASE_URL}/api/system/stop")
    except:
        pass
