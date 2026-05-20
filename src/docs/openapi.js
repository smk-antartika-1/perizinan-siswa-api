const authSecurity = [{ bearerAuth: [] }];

const uuidPathParam = (name = "id") => ({
  in: "path",
  name,
  required: true,
  schema: { type: "string", format: "uuid" },
});

const roleSchema = {
  type: "string",
  enum: ["siswa", "wali_kelas", "guru_piket", "security", "admin"],
};
const permissionCategorySchema = {
  type: "string",
  enum: ["sakit", "keperluan", "dispensasi", "lainnya"],
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Perizinan Siswa API",
    version: "1.1.0",
    description:
      "Dokumentasi API untuk sistem perizinan siswa multi-role. Termasuk seluruh API yang dibutuhkan frontend.",
  },
  servers: [{ url: "http://localhost:8000", description: "Local development" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Profile" },
    { name: "Permissions" },
    { name: "Security" },
    { name: "Classes" },
    { name: "Students" },
    { name: "Notifications" },
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
        properties: {
          message: { type: "string", example: "Validation error" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "2024001" },
          password: { type: "string", example: "2024001" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          role: roleSchema,
          username: { type: "string" },
          email: { type: "string", nullable: true },
          nis: { type: "string", nullable: true },
          nip: { type: "string", nullable: true },
          kelas: { type: "string", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      AdminUserRequest: {
        type: "object",
        required: ["name", "username", "password", "role"],
        properties: {
          name: { type: "string", example: "Budi Santoso" },
          username: { type: "string", example: "2024001" },
          password: { type: "string", example: "password123" },
          role: roleSchema,
          email: { type: "string", nullable: true, example: "budi@sekolah.id" },
          nis: { type: "string", nullable: true, example: "2024001" },
          nip: { type: "string", nullable: true, example: "NIP-001" },
          kelas: { type: "string", nullable: true, example: "XII IPA 1" },
        },
      },
      PermissionCreateRequest: {
        type: "object",
        required: ["reason", "departureTime"],
        properties: {
          reason: { type: "string", example: "Keperluan keluarga" },
          departureTime: { type: "string", format: "date-time" },
          estimatedReturnTime: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          type: {
            type: "string",
            enum: ["keluar_masuk", "pulang_tidak_kembali"],
          },
          category: permissionCategorySchema,
          nomorPolisi: {
            type: "string",
            nullable: true,
            example: "B 1234 XYZ",
          },
        },
      },
      Permission: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          studentId: { type: "string", format: "uuid" },
          studentName: { type: "string" },
          nis: { type: "string", nullable: true },
          kelas: { type: "string", nullable: true },
          type: { type: "string" },
          reason: { type: "string" },
          departureTime: { type: "string", format: "date-time" },
          estimatedReturnTime: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          actualReturnTime: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          status: {
            type: "string",
            enum: [
              "pending",
              "approved_wali",
              "approved_piket",
              "rejected",
              "completed",
            ],
          },
          rawStatus: { type: "string" },
          rejectedReason: { type: "string", nullable: true },
          nomorPolisi: { type: "string", nullable: true },
          category: permissionCategorySchema,
          documentUrl: { type: "string", nullable: true },
          suratUrl: { type: "string" },
        },
      },
      ActionRequest: {
        type: "object",
        properties: {
          note: { type: "string" },
          reason: { type: "string" },
          nomorPolisi: { type: "string", nullable: true },
        },
      },
      CommentRequest: {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string", example: "Catatan tambahan." } },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          message: { type: "string" },
          type: {
            type: "string",
            enum: ["info", "warning", "success", "error"],
          },
          permissionId: { type: "string", format: "uuid", nullable: true },
          read: { type: "boolean" },
          timestamp: { type: "string", format: "date-time" },
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
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: { description: "Success" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { refreshToken: { type: "string" } },
              },
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
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password",
        security: authSecurity,
        requestBody: {
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
        summary: "Update profile avatar/nopol",
        security: authSecurity,
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  avatar: { type: "string", format: "binary" },
                  nopol: { type: "string" },
                },
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
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Permission" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Permissions"],
        summary: "Create permission request (siswa)",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionCreateRequest" },
            },
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
        parameters: [uuidPathParam()],
        responses: {
          200: { description: "Success" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/v1/permissions/{id}/surat": {
      get: {
        tags: ["Permissions"],
        summary: "Generate permission letter SVG",
        parameters: [uuidPathParam()],
        responses: {
          200: {
            description: "SVG image",
            content: {
              "image/svg+xml": { schema: { type: "string", format: "binary" } },
            },
          },
        },
      },
    },
    "/api/v1/permissions/{id}/comments": {
      post: {
        tags: ["Permissions"],
        summary: "Add permission comment",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CommentRequest" },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/api/v1/permissions/{id}/wali-approve": {
      patch: {
        tags: ["Permissions"],
        summary: "Approve by wali kelas",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActionRequest" },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/piket-approve": {
      patch: {
        tags: ["Permissions"],
        summary: "Approve by guru piket",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActionRequest" },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/bypass-approve": {
      patch: {
        tags: ["Permissions"],
        summary: "Emergency bypass approval by guru piket",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActionRequest" },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/reject": {
      patch: {
        tags: ["Permissions"],
        summary: "Reject permission",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActionRequest" },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/permissions/{id}/document": {
      post: {
        tags: ["Permissions"],
        summary: "Upload permission document image",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { document: { type: "string", format: "binary" } },
              },
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
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/security/scan/{token}": {
      get: {
        tags: ["Security"],
        summary: "Scan QR token and get permission document",
        parameters: [
          {
            in: "path",
            name: "token",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Success" },
          401: { description: "Invalid token" },
        },
      },
    },
    "/api/v1/security/permissions/{id}/return": {
      patch: {
        tags: ["Security"],
        summary: "Mark student has returned (guru piket, security, admin)",
        security: authSecurity,
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/security/permissions/{id}/no-return": {
      patch: {
        tags: ["Security"],
        summary: "Mark student will not return (guru piket, security, admin)",
        security: authSecurity,
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/security/permissions/{id}/reopen": {
      patch: {
        tags: ["Security"],
        summary: "Reopen returned/no-return permission back to active",
        security: authSecurity,
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/classes": {
      get: {
        tags: ["Classes"],
        summary: "List classes",
        security: authSecurity,
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
    "/api/v1/students/{nis}": {
      get: {
        tags: ["Students"],
        summary: "Get student detail by NIS",
        security: authSecurity,
        parameters: [
          {
            in: "path",
            name: "nis",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Success" },
          404: { description: "Not found" },
        },
      },
    },
    "/api/v1/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List current user notifications",
        security: authSecurity,
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: authSecurity,
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
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
        summary:
          "Export entry/exit report as Excel (guru piket, security, admin)",
        security: authSecurity,
        responses: {
          200: {
            description: "File download",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                { schema: { type: "string", format: "binary" } },
            },
          },
        },
      },
    },
    "/api/v1/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users",
        security: authSecurity,
        parameters: [
          {
            in: "query",
            name: "role",
            schema: { oneOf: [roleSchema, { type: "string", enum: ["all"] }] },
          },
          { in: "query", name: "search", schema: { type: "string" } },
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: { 200: { description: "Success" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create user",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminUserRequest" },
            },
          },
        },
        responses: {
          201: { description: "Created" },
          409: { description: "Username already exists" },
        },
      },
    },
    "/api/v1/admin/users/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update user",
        security: authSecurity,
        parameters: [uuidPathParam()],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminUserRequest" },
            },
          },
        },
        responses: { 200: { description: "Success" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Deactivate user",
        security: authSecurity,
        parameters: [uuidPathParam()],
        responses: { 200: { description: "Success" } },
      },
    },
    "/api/v1/admin/users/export.csv": {
      get: {
        tags: ["Admin"],
        summary: "Export users CSV",
        security: authSecurity,
        parameters: [
          {
            in: "query",
            name: "role",
            schema: { type: "string", default: "all" },
          },
        ],
        responses: {
          200: {
            description: "CSV file",
            content: {
              "text/csv": { schema: { type: "string", format: "binary" } },
            },
          },
        },
      },
    },
    "/api/v1/admin/import-template.csv": {
      get: {
        tags: ["Admin"],
        summary: "Download per-role import CSV template",
        security: authSecurity,
        parameters: [{ in: "query", name: "role", schema: roleSchema }],
        responses: {
          200: {
            description: "CSV template",
            content: {
              "text/csv": { schema: { type: "string", format: "binary" } },
            },
          },
        },
      },
    },
    "/api/v1/admin/users/import.xlsx": {
      post: {
        tags: ["Admin"],
        summary: "Import users from Excel by role",
        security: authSecurity,
        parameters: [{ in: "query", name: "role", schema: roleSchema }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { 200: { description: "Import completed" } },
      },
    },
    "/api/v1/admin/students/import.xlsx": {
      post: {
        tags: ["Admin"],
        summary: "Import students from Excel (backward compatible)",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { 200: { description: "Import completed" } },
      },
    },
  },
};
