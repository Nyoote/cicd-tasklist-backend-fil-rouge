import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty list when there are no tasks", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all tasks", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task 2", description: "Second" });

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toBeInstanceOf(Array);
			expect(res.body.length).toBe(1);
			expect(res.body[0].id).toBe(createRes.body.id);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return a single task by id", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task 3", description: "Third" });

			const res = await request(app).get(`/api/tasks/${createRes.body.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(createRes.body.id);
			expect(res.body.title).toBe("E2E Task 3");
		});

		it("should return 400 for invalid task id", async () => {
			const res = await request(app).get("/api/tasks/abc");

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Invalid task ID" });
		});

		it("should return 404 when task does not exist", async () => {
			const res = await request(app).get("/api/tasks/9999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update an existing task", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task 4", description: "Fourth" });

			const updateRes = await request(app)
				.put(`/api/tasks/${createRes.body.id}`)
				.send({ title: "Updated Task", completed: true });

			expect(updateRes.status).toBe(200);
			expect(updateRes.body.id).toBe(createRes.body.id);
			expect(updateRes.body.title).toBe("Updated Task");
			expect(updateRes.body.completed).toBe(true);
		});

		it("should return 400 for invalid task id", async () => {
			const res = await request(app).put("/api/tasks/abc").send({ title: "Nope" });

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Invalid task ID" });
		});

		it("should return 404 when updating a missing task", async () => {
			const res = await request(app).put("/api/tasks/9999").send({ title: "Missing" });

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete an existing task", async () => {
			const createRes = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task 5", description: "Fifth" });

			const res = await request(app).delete(`/api/tasks/${createRes.body.id}`);

			expect(res.status).toBe(204);
			expect(res.body).toEqual({});
		});

		it("should return 400 for invalid task id", async () => {
			const res = await request(app).delete("/api/tasks/abc");

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Invalid task ID" });
		});

		it("should return 404 when deleting a missing task", async () => {
			const res = await request(app).delete("/api/tasks/9999");

			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: "Task not found" });
		});
	});

	describe("POST /api/tasks validation", () => {
		it("should reject a missing title", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "No title" });

			expect(res.status).toBe(400);
			expect(res.body).toEqual({ error: "Title is required and must be a non-empty string" });
		});
	});
})