#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Brazilian Feirantes Marketplace
Tests all backend APIs including authentication, products, orders, and public store endpoints.
"""

import requests
import json
import base64
from datetime import datetime
import uuid

# Backend URL from frontend .env
BASE_URL = "https://4f3c215f-f42f-46ba-9a44-ee92c471daf5.preview.emergentagent.com/api"

class FeirantesAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token = None
        self.vendor_id = None
        self.product_id = None
        self.order_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"API is running: {data.get('message', '')}")
                return True
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_vendor_registration(self):
        """Test vendor registration"""
        vendor_data = {
            "nome": "Maria Silva",
            "email": f"maria.silva.{uuid.uuid4().hex[:8]}@email.com",
            "telefone": "(11) 98765-4321",
            "senha": "senha123",
            "nome_loja": f"Feira_da_Maria_{uuid.uuid4().hex[:6]}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=vendor_data)
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                vendor = data.get("vendor", {})
                self.vendor_id = vendor.get("id")
                self.vendor_email = vendor_data["email"]
                self.vendor_password = vendor_data["senha"]
                self.vendor_loja = vendor_data["nome_loja"]
                
                self.log_test("Vendor Registration", True, 
                            f"Vendor registered successfully. ID: {self.vendor_id}")
                return True
            else:
                self.log_test("Vendor Registration", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Vendor Registration", False, f"Error: {str(e)}")
            return False
    
    def test_vendor_login(self):
        """Test vendor login"""
        if not hasattr(self, 'vendor_email'):
            self.log_test("Vendor Login", False, "No registered vendor to test login")
            return False
            
        login_data = {
            "email": self.vendor_email,
            "senha": self.vendor_password
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                vendor = data.get("vendor", {})
                
                if token and vendor.get("id") == self.vendor_id:
                    self.log_test("Vendor Login", True, "Login successful with valid token")
                    return True
                else:
                    self.log_test("Vendor Login", False, "Invalid response structure")
                    return False
            else:
                self.log_test("Vendor Login", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Vendor Login", False, f"Error: {str(e)}")
            return False
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@email.com",
            "senha": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 401:
                self.log_test("Invalid Login", True, "Correctly rejected invalid credentials")
                return True
            else:
                self.log_test("Invalid Login", False, 
                            f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Invalid Login", False, f"Error: {str(e)}")
            return False
    
    def test_create_product(self):
        """Test product creation with authentication"""
        if not self.access_token:
            self.log_test("Create Product", False, "No access token available")
            return False
            
        # Create a simple base64 image (1x1 pixel PNG)
        sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        product_data = {
            "nome": "Tomate Orgânico",
            "descricao": "Tomates frescos e orgânicos direto da fazenda",
            "preco": 8.50,
            "quantidade": 25,
            "categoria": "Verduras e Legumes",
            "imagem": sample_image
        }
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.post(f"{self.base_url}/products", 
                                   json=product_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.product_id = data.get("id")
                self.log_test("Create Product", True, 
                            f"Product created successfully. ID: {self.product_id}")
                return True
            else:
                self.log_test("Create Product", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Product", False, f"Error: {str(e)}")
            return False
    
    def test_get_my_products(self):
        """Test getting vendor's products"""
        if not self.access_token:
            self.log_test("Get My Products", False, "No access token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/products/my", headers=headers)
            if response.status_code == 200:
                products = response.json()
                if isinstance(products, list) and len(products) > 0:
                    self.log_test("Get My Products", True, 
                                f"Retrieved {len(products)} products")
                    return True
                else:
                    self.log_test("Get My Products", True, "No products found (empty list)")
                    return True
            else:
                self.log_test("Get My Products", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get My Products", False, f"Error: {str(e)}")
            return False
    
    def test_update_product(self):
        """Test product update"""
        if not self.access_token or not self.product_id:
            self.log_test("Update Product", False, "No access token or product ID available")
            return False
            
        updated_data = {
            "nome": "Tomate Orgânico Premium",
            "descricao": "Tomates frescos e orgânicos premium direto da fazenda",
            "preco": 12.00,
            "quantidade": 20,
            "categoria": "Verduras e Legumes",
            "imagem": None
        }
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.put(f"{self.base_url}/products/{self.product_id}", 
                                  json=updated_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("nome") == updated_data["nome"] and data.get("preco") == updated_data["preco"]:
                    self.log_test("Update Product", True, "Product updated successfully")
                    return True
                else:
                    self.log_test("Update Product", False, "Product data not updated correctly")
                    return False
            else:
                self.log_test("Update Product", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Product", False, f"Error: {str(e)}")
            return False
    
    def test_public_store(self):
        """Test public store endpoint"""
        if not hasattr(self, 'vendor_loja'):
            self.log_test("Public Store", False, "No store name available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/loja/{self.vendor_loja}")
            if response.status_code == 200:
                data = response.json()
                vendor = data.get("vendor", {})
                products = data.get("products", [])
                
                if vendor.get("id") == self.vendor_id and isinstance(products, list):
                    self.log_test("Public Store", True, 
                                f"Store retrieved with {len(products)} products")
                    return True
                else:
                    self.log_test("Public Store", False, "Invalid store data structure")
                    return False
            else:
                self.log_test("Public Store", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Public Store", False, f"Error: {str(e)}")
            return False
    
    def test_store_categories(self):
        """Test store categories endpoint"""
        if not hasattr(self, 'vendor_loja'):
            self.log_test("Store Categories", False, "No store name available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/categorias/{self.vendor_loja}")
            if response.status_code == 200:
                data = response.json()
                categories = data.get("categorias", [])
                
                if isinstance(categories, list):
                    self.log_test("Store Categories", True, 
                                f"Retrieved {len(categories)} categories")
                    return True
                else:
                    self.log_test("Store Categories", False, "Invalid categories data")
                    return False
            else:
                self.log_test("Store Categories", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Store Categories", False, f"Error: {str(e)}")
            return False
    
    def test_create_order(self):
        """Test order creation"""
        if not self.vendor_id or not self.product_id:
            self.log_test("Create Order", False, "No vendor ID or product ID available")
            return False
            
        order_data = {
            "vendor_id": self.vendor_id,
            "cliente_nome": "João Santos",
            "cliente_telefone": "(11) 99999-8888",
            "cliente_endereco": "Rua das Flores, 123 - São Paulo, SP",
            "observacoes": "Entregar pela manhã, por favor",
            "items": [
                {
                    "product_id": self.product_id,
                    "nome": "Tomate Orgânico Premium",
                    "preco": 12.00,
                    "quantidade": 3
                }
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/orders", json=order_data)
            if response.status_code == 200:
                data = response.json()
                self.order_id = data.get("id")
                total = data.get("total")
                expected_total = 12.00 * 3  # 36.00
                
                if abs(total - expected_total) < 0.01:  # Allow for floating point precision
                    self.log_test("Create Order", True, 
                                f"Order created successfully. ID: {self.order_id}, Total: R$ {total}")
                    return True
                else:
                    self.log_test("Create Order", False, 
                                f"Total calculation incorrect. Expected: {expected_total}, Got: {total}")
                    return False
            else:
                self.log_test("Create Order", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Order", False, f"Error: {str(e)}")
            return False
    
    def test_get_my_orders(self):
        """Test getting vendor's orders"""
        if not self.access_token:
            self.log_test("Get My Orders", False, "No access token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.get(f"{self.base_url}/orders/my", headers=headers)
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list):
                    self.log_test("Get My Orders", True, 
                                f"Retrieved {len(orders)} orders")
                    return True
                else:
                    self.log_test("Get My Orders", False, "Invalid orders data structure")
                    return False
            else:
                self.log_test("Get My Orders", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get My Orders", False, f"Error: {str(e)}")
            return False
    
    def test_update_order_status(self):
        """Test updating order status"""
        if not self.access_token or not self.order_id:
            self.log_test("Update Order Status", False, "No access token or order ID available")
            return False
            
        status_data = {"status": "aceito"}
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.put(f"{self.base_url}/orders/{self.order_id}/status", 
                                  json=status_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "sucesso" in data.get("message", "").lower():
                    self.log_test("Update Order Status", True, "Order status updated successfully")
                    return True
                else:
                    self.log_test("Update Order Status", False, "Unexpected response message")
                    return False
            else:
                self.log_test("Update Order Status", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Order Status", False, f"Error: {str(e)}")
            return False
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        try:
            response = requests.get(f"{self.base_url}/products/my")
            if response.status_code == 403:  # Forbidden
                self.log_test("Unauthorized Access", True, "Correctly blocked unauthorized access")
                return True
            else:
                self.log_test("Unauthorized Access", False, 
                            f"Expected 403, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Unauthorized Access", False, f"Error: {str(e)}")
            return False
    
    def test_delete_product(self):
        """Test product deletion"""
        if not self.access_token or not self.product_id:
            self.log_test("Delete Product", False, "No access token or product ID available")
            return False
            
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = requests.delete(f"{self.base_url}/products/{self.product_id}", 
                                     headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "excluído" in data.get("message", "").lower():
                    self.log_test("Delete Product", True, "Product deleted successfully")
                    return True
                else:
                    self.log_test("Delete Product", False, "Unexpected response message")
                    return False
            else:
                self.log_test("Delete Product", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Delete Product", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Brazilian Feirantes Marketplace Backend Tests")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        self.test_vendor_registration()
        self.test_vendor_login()
        self.test_invalid_login()
        self.test_unauthorized_access()
        
        # Product management tests
        print("\n📦 PRODUCT MANAGEMENT TESTS")
        print("-" * 30)
        self.test_create_product()
        self.test_get_my_products()
        self.test_update_product()
        
        # Public store tests
        print("\n🏪 PUBLIC STORE TESTS")
        print("-" * 30)
        self.test_public_store()
        self.test_store_categories()
        
        # Order management tests
        print("\n📋 ORDER MANAGEMENT TESTS")
        print("-" * 30)
        self.test_create_order()
        self.test_get_my_orders()
        self.test_update_order_status()
        
        # Cleanup tests
        print("\n🗑️ CLEANUP TESTS")
        print("-" * 30)
        self.test_delete_product()
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print("=" * 60)
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = FeirantesAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the details above.")