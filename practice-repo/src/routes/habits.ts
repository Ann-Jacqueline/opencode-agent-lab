import { Router } from "express";
import { z } from "zod";
import { getUserId, requireUser } from "../middleware/auth.js";
import {
  completeHabit,
  createHabit,
  getHabit,
  listCompletionDates,
  listHabits
} from "../services/habits.js";

export const habitsRouter = Router();

habitsRouter.use(requireUser);

const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  cadence: z.enum(["daily", "weekly"]).default("daily")
});

habitsRouter.get("/", (req, res) => {
  const userId = getUserId(req);
  res.json({ habits: listHabits(userId) });
});

habitsRouter.post("/", (req, res) => {
  const userId = getUserId(req);
  const parsed = createHabitSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const habit = createHabit(userId, parsed.data);
  res.status(201).json({ habit });
});

habitsRouter.get("/:id", (req, res) => {
  const userId = getUserId(req);
  const habit = getHabit(userId, req.params.id);

  if (!habit) {
    res.status(404).json({ error: "habit_not_found" });
    return;
  }

  res.json({ habit, completions: listCompletionDates(habit.id) });
});

habitsRouter.post("/:id/complete", (req, res) => {
  const userId = getUserId(req);
  const result = completeHabit(userId, req.params.id);

  if (!result) {
    res.status(404).json({ error: "habit_not_found" });
    return;
  }

  res.json(result);
});
