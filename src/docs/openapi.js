const authSecurity = [{ bearerAuth: [] }];

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Perizinan Siswa API",
    version: "1.0.0",
    description: "Dokumentasi API untuk sistem perizinan siswa multi-role.",
  },
  servers: [{ url: "http://localhost:8000", description: "Local development" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Profile" },
    { name: "Permissions" },
    { name: "Security" },
    { name: "Classes" },
    { name: "Reports" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: { message: { type: "string", example: "Validation error" } },
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "2024001" },
          password: { type: "string", example: "2024001" },
        },
      },
      PermissionCreateRequest: {
        type: "object",
        required: ["reason", "departureTime"],
        properties: {
          reason: { type: "string", example: "Keperluan keluarga" },
          departureTime: { type: "string", format: "date-time" },
          estimatedReturnTime: { type: "string", format: "date-time", nullable: true },
          type: { type: "string", enum: ["keluar_masuk", "pulang_tidak_kembali"] },
        },
      },
      ActionRequest: {
        type: "object",
        properties: {
          note: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: { 200: { description: "Success" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { type: "object", properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile",
        security: authSecurity,
        responses: { 200: { description: "Success" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/v1/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword", "confirmPassword"],
                properties: {
                  oldPassword: { type: "string" },
                  newPassword: { type: "string" },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get profile",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update profile (avatar/nopol)",
        security: authSecurity,
        requestBody: {
          required: false,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { avatar: { type: "string", format: "binary" }, nopol: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions": {
      get: {
        tags: ["Permissions"],
        summary: "List permissions by role scope",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
      post: {
        tags: ["Permissions"],
        summary: "Create permission request (siswa)",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PermissionCreateRequest" } },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/api/v1/permissions/history/grouped-by-class": {
      get: {
        tags: ["Permissions"],
        summary: "History grouped by class",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}": {
      get: {
        tags: ["Permissions"],
        summary: "Permission detail",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Success" }, 404: { description: "Not found" } },
      },
    },
    "/api/v1/permissions/{id}/wali-approve": {
      patch: {
        tags: ["Permissions"],
        summary: "Approve by wali kelas",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ActionRequest" } } },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/piket-approve": {
      patch: {
        tags: ["Permissions"],
        summary: "Approve by guru piket",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ActionRequest" } } },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/reject": {
      patch: {
        tags: ["Permissions"],
        summary: "Reject permission",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ActionRequest" } } },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/document": {
      post: {
        tags: ["Permissions"],
        summary: "Upload permission document image",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { document: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/api/v1/permissions/{id}/qr": {
      post: {
        tags: ["Permissions"],
        summary: "Generate QR signed URL",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/security/scan/{token}": {
      get: {
        tags: ["Security"],
        summary: "Scan QR token and get permission document",
        parameters: [{ in: "path", name: "token", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Success" }, 401: { description: "Invalid token" } },
      },
    },
    "/api/v1/security/permissions/{id}/return": {
      patch: {
        tags: ["Security"],
        summary: "Mark student has returned",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/security/permissions/{id}/no-return": {
      patch: {
        tags: ["Security"],
        summary: "Mark student will not return",
        security: authSecurity,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/classes/students": {
      get: {
        tags: ["Classes"],
        summary: "Get students grouped by class",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/reports/entry-exit": {
      get: {
        tags: ["Reports"],
        summary: "Get entry/exit report",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/reports/entry-exit/export.xlsx": {
      get: {
        tags: ["Reports"],
        summary: "Export entry/exit report as Excel",
        security: authSecurity,
        responses: { 200: { description: "File download" } },
      },
    },
    "/api/v1/admin/students/import.xlsx": {
      post: {
        tags: ["Admin"],
        summary: "Import students from Excel",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: { 200: { description: "Import completed" } },
      },
    },
  },
};
