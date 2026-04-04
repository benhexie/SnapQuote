const axios = require("axios");

async function testPreview() {
  try {
    const response = await axios.post(
      "http://localhost:8080/api/quotes/f6904a52-d35f-4fdc-bd58-5e6d47a0a5bf/preview",
      {
        company_name: "Apex Construction",
        company_address: "999 Builders Way, Austin, TX 78701",
        company_phone: "(512) 555-9999",
        company_email: "billing@apexconstruction.com",
        client_name: "John Smith",
        client_address: "123 Fake Street\nAustin, TX 78704",
        client_email: "john@example.com",
        template: "classic", // Testing the new classic template
        theme_color: "#ef4444", // Red
        theme_color_light: "#fef2f2", // Light Red
        discount: 100.5, // Added optional discount
        show_signature: true, // Added optional signature line
      },
      {
        headers: {
          Authorization: "Bearer mock_contractor_999",
          "Content-Type": "application/json",
        },
      },
    );

    console.log("--- Rendered HTML Preview ---");
    console.log(
      response.data.substring(0, 1000) +
        "...\n\n[... HTML OMITTED ...]\n\n" +
        response.data.substring(response.data.length - 500),
    );
    console.log("--- End of HTML ---");
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message,
    );
  }
}

testPreview();
