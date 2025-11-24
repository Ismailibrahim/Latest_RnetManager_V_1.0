// Quick test script to verify backend connection
// Run this in browser console when on /admin/subscriptions page

async function testAdminConnection() {
  const token = localStorage.getItem("auth_token");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  
  console.log("Testing connection to:", `${API_BASE_URL}/admin/landlords`);
  console.log("Token exists:", !!token);
  
  if (!token) {
    console.error("❌ No auth token found. Please log in first.");
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/landlords`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Success! Data:", data);
    } else {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      console.error("❌ Error:", response.status, error);
    }
  } catch (err) {
    console.error("❌ Network error:", err);
    console.error("This usually means:");
    console.error("1. Backend server is not running");
    console.error("2. CORS is blocking the request");
    console.error("3. Wrong API URL");
  }
}

testAdminConnection();

