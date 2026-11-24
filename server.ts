import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  round2,
  normalizeDateStr,
  addMonthsPreservingDay,
  calculateCreditCardInvoiceDates,
  doesTransactionBelongToCompetence,
  distributeInstallmentsCents,
  distributeSplitsCents,
  resolvePurchaseGroup,
  getAccountCreditLimit,
  computeFinancialDashboard,
} from "./src/lib/financeMath";

let currentDir = process.cwd();
// Removing import.meta.url to prevent Vercel ncc build errors

dotenv.config();
if (fs.existsSync(path.join(process.cwd(), '.env.example'))) {
  dotenv.config({ path: path.join(process.cwd(), '.env.example') });
}

const DEFAULT_SUPABASE_URL = "https://gymxdeijrgorugqqiteh.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_" + "KPeLuuPs7mOf395Jv0YmeQ_mueP5jXE";
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = "sb_secret_" + "lXfZEvYWdg2WjYedXnwl8Q_qURe-vX7";

// Sanitize URL: remove /rest/v1/ suffix if the user accidentally pasted the REST endpoint instead of the project URL
// Also remove trailing slashes
const supabaseUrlRaw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseUrl = (supabaseUrlRaw ? supabaseUrlRaw.split('/rest/v1/')[0].replace(/\/+$/, "") : "") || DEFAULT_SUPABASE_URL;

// Initialize Gemini client on the server
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

// Helper to mask secrets securely for diagnostic logs
const maskSecretSecurely = (key: string | undefined): string => {
  if (!key) return "UNDEFINED / EMPTY";
  if (key.length <= 8) return `DEFINED (Length: ${key.length}, format too short to mask)`;
  return `DEFINED (Length: ${key.length}, starts with: "${key.slice(0, 4)}...", ends with: "...${key.slice(-4)}")`;
};

console.log("=== VERCEL BUILD & RUNTIME DIAGNOSTICS (SUPABASE SETUP) ===");
console.log(`[ENV] process.env.SUPABASE_URL: ${process.env.SUPABASE_URL ? "DEFINED" : "NOT DEFINED"}`);
console.log(`[ENV] process.env.VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? "DEFINED" : "NOT DEFINED"}`);
console.log(`[ENV] Final resolved supabaseUrl: ${supabaseUrl}`);
console.log(`[ENV] process.env.SUPABASE_ANON_KEY: ${maskSecretSecurely(process.env.SUPABASE_ANON_KEY)}`);
console.log(`[ENV] process.env.VITE_SUPABASE_ANON_KEY: ${maskSecretSecurely(process.env.VITE_SUPABASE_ANON_KEY)}`);
console.log(`[ENV] process.env.SUPABASE_SERVICE_ROLE_KEY: ${maskSecretSecurely(process.env.SUPABASE_SERVICE_ROLE_KEY)}`);
console.log(`[ENV] process.env.VITE_SUPABASE_SERVICE_ROLE_KEY: ${maskSecretSecurely(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)}`);
console.log(`[INIT] Server Client using Service Role Key: ${!!serviceRoleKey ? "YES" : "NO (FALLBACK TO ANON KEY)"}`);
console.log("==========================================================");

// Use service role key for backend operations if available to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API Routes
app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl,
      supabaseKey
    });
  });

  app.get("/api/test", (req, res) => {
    res.json({ message: "test success" });
  });

  // Authentication Middleware
  const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith("/api") || req.path === "/api/config") {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.error("Auth error:", error?.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Map authorized admin/manager emails to share the primary data tenant
      if (user.email === 'brancoescritorio1@gmail.com' || user.email === 'larapecanhag@outlook.com') {
        console.log(`Mapping user ${user.email} (id: ${user.id}) to primary tenant id '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6'`);
        user.id = '814821bb-c4e7-47a6-bff2-7a0ab5f1c7d6';
      }

      (req as any).user = user;
      next();
    } catch (err) {
      console.error("Auth middleware exception:", err);
      return res.status(500).json({ error: "Internal server error in auth middleware" });
    }
  };

  // Apply middleware to all subsequent API routes
  app.use(authenticateUser);

  app.get("/api/users", async (req, res) => {
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.warn("SUPABASE_SERVICE_ROLE_KEY missing. Cannot list users.");
        return res.status(501).json({ error: "Service role key not configured on server." });
      }

      try {
        const payload = JSON.parse(Buffer.from(serviceRoleKey.split(".")[1], "base64").toString());
        if (payload.role === "anon") {
          console.warn("SUPABASE_SERVICE_ROLE_KEY is configured with the anon key. Cannot list users.");
          return res.status(501).json({ error: "Service role key not configured on server." });
        }
      } catch (e) {
        // Ignore parsing errors
      }

      let users: any[] = [];
      const useDirectFetch = !serviceRoleKey.startsWith("eyJ");

      if (useDirectFetch) {
        console.log("[AUTH] Using direct HTTP fetch for prefix-based service role key...");
        const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
        const fetchRes = await fetch(authUrl, {
          method: "GET",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`
          }
        });

        if (!fetchRes.ok) {
          const errMsg = await fetchRes.text().catch(() => "Unknown error");
          console.error(`[AUTH] Direct fetch listUsers error: ${fetchRes.status} ${fetchRes.statusText}`, errMsg);
          if (fetchRes.status === 401 || fetchRes.status === 403) {
            return res.status(501).json({ error: "Service role key is invalid or lacks permissions." });
          }
          return res.status(500).json({ error: `Supabase Auth API Error: ${fetchRes.statusText} (${errMsg})` });
        }

        const responseData = await fetchRes.json() as { users?: any[] };
        users = responseData.users || [];
      } else {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
          console.error("Error listing users:", error.message, error);
          if (error.message.includes("User not allowed") || error.message.includes("not authorized")) {
            return res.status(501).json({ error: "Service role key is invalid or lacks permissions." });
          }
          return res.status(500).json({ error: `Supabase Error: ${error.message}` });
        }

        users = data?.users || [];
      }

      // Map to safe user object
      const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: u.role
      }));

      res.json(safeUsers);
    } catch (err: any) {
      console.error("Unexpected error in /api/users:", err);
      res.status(500).json({ error: `Server Error: ${err.message || String(err)}` });
    }
  });

  app.get("/api/periods", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("periods")
      .select("*")
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Supabase error (periods):", error.message);
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/periods", async (req, res) => {
    const { name } = req.body;
    const user = (req as any).user;
    
    const insertData: any = { 
      name, 
      user_id: user.id
    };
    
    const { data, error } = await supabase.from("periods").insert([insertData]).select().single();
    
    if (error) {
      console.error("Error creating period:", error.message);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.put("/api/periods/:id", async (req, res) => {
    const { name } = req.body;
    const user = (req as any).user;
    
    const { error } = await supabase.from("periods").update({ 
      name
    }).eq("id", req.params.id).eq("user_id", user.id);

    if (error) {
      console.error("Error updating period:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.delete("/api/periods/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("periods").delete().eq("id", req.params.id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting period:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.get("/api/subjects", async (req, res) => {
    const user = (req as any).user;
    const { data: subjects, error: sError } = await supabase.from("subjects").select("*").eq("user_id", user.id);
    
    if (sError) {
      console.error("Supabase error (subjects):", sError.message);
      return res.json([]);
    }

    // Fetch deadlines from notas_atividades to include in the subject list
    const { data: notas, error: nError } = await supabase.from("notas_atividades").select("mes_materia_id, atividade_1_prazo, atividade_2_prazo, prova_data, atividade_1_inicio, atividade_2_inicio, prova_inicio");
    
    if (nError) {
      console.error("Supabase error (notas for subjects):", nError.message);
      return res.json(subjects || []);
    }

    const notasMap = new Map(notas.map(n => [Number(n.mes_materia_id), n]));
    const subjectsWithDeadlines = (subjects || []).map(s => {
      const nota = notasMap.get(Number(s.id));
      return {
        ...s,
        act1_end: nota?.atividade_1_prazo,
        act2_end: nota?.atividade_2_prazo,
        exam_end: nota?.prova_data,
        act1_start: nota?.atividade_1_inicio,
        act2_start: nota?.atividade_2_inicio,
        exam_start: nota?.prova_inicio
      };
    });

    res.json(subjectsWithDeadlines);
  });

  app.post("/api/subjects", async (req, res) => {
    const { month_year, subject_name, professor, workload, period_id } = req.body;
    const user = (req as any).user;
    
    // Ensure period_id is handled correctly (convert to number if it's a string of digits)
    const pId = (typeof period_id === 'string' && /^\d+$/.test(period_id)) ? parseInt(period_id) : period_id;

    const insertData: any = { 
      month_year, 
      subject_name, 
      professor, 
      workload: workload ? parseInt(workload.toString()) : null, 
      period_id: pId,
      user_id: user.id
    };

    const { data: subject, error: sError } = await supabase.from("subjects")
      .insert([insertData])
      .select().single();
    
    if (sError) {
      console.error("Error creating subject:", sError.message);
      return res.status(500).json(sError);
    }
    
    const subjectId = subject.id;
    // Create linked records in new tables
    try {
      await Promise.all([
        supabase.from("presencas").insert([{ mes_materia_id: subjectId, periodo_id: pId }]),
        supabase.from("notas_atividades").insert([{ mes_materia_id: subjectId, periodo_id: pId }]),
        supabase.from("conteudos_web").insert([{ mes_materia_id: subjectId, periodo_id: pId }])
      ]);
    } catch (err) {
      console.error("Error creating related records:", err);
    }
    
    res.json({ id: subjectId });
  });

  app.put("/api/subjects/:id", async (req, res) => {
    const { month_year, subject_name, professor, workload, period_id } = req.body;
    const user = (req as any).user;
    const pId = (typeof period_id === 'string' && /^\d+$/.test(period_id)) ? parseInt(period_id) : period_id;

    const updateData: any = { 
      month_year, 
      subject_name, 
      professor, 
      workload: workload ? parseInt(workload.toString()) : null, 
      period_id: pId 
    };

    const { error } = await supabase.from("subjects")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error updating subject:", error.message);
      return res.status(500).json(error);
    }

    // Update periodo_id in related tables too
    try {
      await Promise.all([
        supabase.from("presencas").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id),
        supabase.from("notas_atividades").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id),
        supabase.from("conteudos_web").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id)
      ]);
    } catch (err) {
      console.error("Error updating related records:", err);
    }

    res.json({ success: true });
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("subjects")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error deleting subject:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.get("/api/attendance/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("presencas").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/attendance/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'aula_1', 'aula_2', 'aula_3', 'aula_4', 
      'data_aula_1', 'data_aula_2', 'data_aula_3', 'data_aula_4', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("presencas")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Error updating attendance:", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("presencas").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      if (insertError) {
        console.error("Error inserting attendance:", insertError.message);
        return res.status(500).json(insertError);
      }
    }
    
    res.json({ success: true });
  });

  app.get("/api/activities/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("notas_atividades").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/activities/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'atividade_1_nota', 'atividade_2_nota', 'prova_nota', 
      'atividade_1_status', 'atividade_2_status', 
      'atividade_1_prazo', 'atividade_2_prazo', 'prova_data', 
      'atividade_1_inicio', 'atividade_2_inicio', 'prova_inicio', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field.endsWith('_nota')) {
          updateData[field] = (body[field] === '' || body[field] === null) ? null : parseFloat(body[field].toString());
        } else if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("notas_atividades")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Supabase error (update activities):", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("notas_atividades").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      
      if (insertError) {
        console.error("Supabase error (insert activities):", insertError.message);
        return res.status(500).json(insertError);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/web_contents/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("conteudos_web").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/web_contents/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'conteudo_1_assistido', 'conteudo_2_assistido', 'conteudo_3_assistido', 'conteudo_4_assistido', 
      'data_1', 'data_2', 'data_3', 'data_4', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("conteudos_web")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Error updating web contents:", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("conteudos_web").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      if (insertError) {
        console.error("Error inserting web contents:", insertError.message);
        return res.status(500).json(insertError);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
      const user = (req as any).user;
      
      const subjectsRes = await supabase.from("subjects").select("id, month_year, subject_name, period_id").eq("user_id", user.id);
      
      if (subjectsRes.error) {
        console.error("Dashboard subjects fetch error:", subjectsRes.error.message);
        throw subjectsRes.error;
      }

      const subjectsData = subjectsRes.data || [];
      const subjectIds = subjectsData.map(s => s.id);

      // Fetch related data only for these subjects
      const [presencasRes, notasRes, webRes] = await Promise.all([
        supabase.from("presencas").select("mes_materia_id, aula_1, aula_2, aula_3, aula_4").in("mes_materia_id", subjectIds),
        supabase.from("notas_atividades").select("mes_materia_id, atividade_1_status, atividade_1_nota, atividade_2_status, atividade_2_nota, prova_nota, atividade_1_prazo, atividade_2_prazo, prova_data, atividade_1_inicio, atividade_2_inicio, prova_inicio").in("mes_materia_id", subjectIds),
        supabase.from("conteudos_web").select("mes_materia_id, conteudo_1_assistido, conteudo_2_assistido, conteudo_3_assistido, conteudo_4_assistido").in("mes_materia_id", subjectIds)
      ]);

      const presencasMap = new Map((presencasRes.data || []).map(p => [Number(p.mes_materia_id), p]));
      const notasMap = new Map((notasRes.data || []).map(n => [Number(n.mes_materia_id), n]));
      const webMap = new Map((webRes.data || []).map(w => [Number(w.mes_materia_id), w]));

      const flattened = subjectsData.map((item: any) => {
        const itemId = Number(item.id);
        const presenca = presencasMap.get(itemId);
        const nota = notasMap.get(itemId);
        const web = webMap.get(itemId);

        return {
          id: item.id,
          month_year: item.month_year,
          subject_name: item.subject_name,
          period_id: item.period_id,
          aula1_present: presenca?.aula_1 ? 1 : 0,
          aula2_present: presenca?.aula_2 ? 1 : 0,
          aula3_present: presenca?.aula_3 ? 1 : 0,
          aula4_present: presenca?.aula_4 ? 1 : 0,
          act1_status: nota?.atividade_1_status || 'Não iniciada',
          act1_grade: nota?.atividade_1_nota,
          act2_status: nota?.atividade_2_status || 'Não iniciada',
          act2_grade: nota?.atividade_2_nota,
          exam_grade: nota?.prova_nota,
          c1_watched: web?.conteudo_1_assistido ? 1 : 0,
          c2_watched: web?.conteudo_2_assistido ? 1 : 0,
          c3_watched: web?.conteudo_3_assistido ? 1 : 0,
          c4_watched: web?.conteudo_4_assistido ? 1 : 0,
          act1_deadline: nota?.atividade_1_prazo,
          act2_deadline: nota?.atividade_2_prazo,
          exam_date: nota?.prova_data,
          act1_start: nota?.atividade_1_inicio,
          act2_start: nota?.atividade_2_inicio,
          exam_start: nota?.prova_inicio
        };
      });

      res.json(flattened);
    } catch (error: any) {
      console.error("Dashboard error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- System Setup ---
  app.post("/api/setup-finance", async (req, res) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: "Service role key missing" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SQL to create tables if they don't exist
    // Note: Supabase JS client doesn't support raw SQL execution directly via `rpc` unless a function is created.
    // However, we can check if tables exist by trying to select from them.
    // If they error, we can inform the user to run the migration script.
    
    // Ideally, we would use a migration tool or raw SQL execution if available.
    // Since we are limited, we will just check and return status.
    
    const tables = ["financial_categories", "financial_accounts", "financial_transactions", "financial_responsibles", "clients", "client_sales", "client_installments", "chacara_users", "chacara_bills", "chacara_settings", "marketing_clients", "marketing_payments", "marketing_posts"];
    const status: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).select("id").limit(1);
      status[table] = !error;
    }

    res.json({ 
      success: true, 
      tables: status,
      message: "Verificação concluída. Se alguma tabela estiver faltando (false), por favor execute o script SQL no painel do Supabase." 
    });
  });

  // --- Financial Module Routes ---

  // Categories
  app.get("/api/finance/categories", async (req, res) => { try { 
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_categories").select("*").eq("user_id", user.id);
    if (error) return res.status(500).json(error);
     res.json(data || []); } catch (err: any) { res.status(500).json({ error: err.message }); } });

  app.post("/api/finance/categories", async (req, res) => {
    const user = (req as any).user;
    const { name, type } = req.body;
    const { data, error } = await supabase.from("financial_categories").insert([{ name, type, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/finance/categories/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, type } = req.body;
    const { error } = await supabase.from("financial_categories").update({ name, type }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/finance/categories/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_categories").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  const isFinMissingColumnError = (err: any) => {
    if (!err) return false;
    const msg = String(err.message || '');
    return err.code === '42703' || err.code === 'PGRST204' || msg.includes('column') || msg.includes('schema cache');
  };

  const FIN_OPTIONAL_TX_COLS = ['gross_amount', 'discount_amount', 'is_transfer', 'transfer_account_id', 'transfer_group_id'];
  const FIN_OPTIONAL_ACC_COLS = ['credit_limit'];

  const stripKeys = (obj: Record<string, any>, keys: string[]) => {
    const copy: Record<string, any> = {};
    Object.keys(obj).forEach((k) => {
      if (!keys.includes(k) && obj[k] !== undefined) copy[k] = obj[k];
    });
    return copy;
  };

  const safeInsertFinTransactions = async (rows: any[]) => {
    const firstAttempt = await supabase.from("financial_transactions").insert(rows).select();
    if (!firstAttempt.error) return firstAttempt;
    if (!isFinMissingColumnError(firstAttempt.error)) return firstAttempt;
    const strippedRows = rows.map((r) => stripKeys(r, FIN_OPTIONAL_TX_COLS));
    return await supabase.from("financial_transactions").insert(strippedRows).select();
  };

  const safeUpdateFinTransaction = async (id: any, userId: string, patch: Record<string, any>) => {
    const firstAttempt = await supabase
      .from("financial_transactions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (!firstAttempt.error) return firstAttempt;
    if (!isFinMissingColumnError(firstAttempt.error)) return firstAttempt;
    const stripped = stripKeys(patch, FIN_OPTIONAL_TX_COLS);
    if (Object.keys(stripped).length === 0) return { data: null, error: null };
    return await supabase
      .from("financial_transactions")
      .update(stripped)
      .eq("id", id)
      .eq("user_id", userId);
  };

  const recalculateCardPendingDueDates = async (userId: string, cardId: any, closingDay: number, dueDay: number, mode: 'pending' | 'all' = 'pending') => {
    const { data: cardTxs, error } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("account_id", cardId);
    if (error || !cardTxs || cardTxs.length === 0) return 0;

    let updatedCount = 0;
    for (const tx of cardTxs) {
      if (mode === 'pending' && tx.status === 'pago') continue;
      const group = resolvePurchaseGroup(tx, cardTxs);
      const anchorDate = group.purchaseDate || normalizeDateStr(tx.date);
      const instOffset = tx.is_installment ? Math.max(0, Number(tx.installment_number || 1) - 1) : 0;
      const info = calculateCreditCardInvoiceDates(anchorDate, closingDay, dueDay, instOffset);
      if (info.dueDateStr && info.dueDateStr !== normalizeDateStr(tx.due_date)) {
        const { error: uErr } = await supabase
          .from("financial_transactions")
          .update({ due_date: info.dueDateStr })
          .eq("id", tx.id)
          .eq("user_id", userId);
        if (!uErr) updatedCount++;
      }
    }
    return updatedCount;
  };

  // Accounts
  app.get("/api/finance/accounts", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase.from("financial_accounts").select("*").eq("user_id", user.id);
      if (error) return res.status(500).json(error);
      const normalized = (data || []).map((acc: any) => ({
        ...acc,
        credit_limit: acc.type === 'credito' ? getAccountCreditLimit(acc) : (acc.credit_limit ?? null),
      }));
      res.json(normalized);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/finance/accounts", async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, initial_balance, credit_limit, type, closing_day, due_day } = req.body;
      const cleanLimit = credit_limit !== undefined && credit_limit !== '' && credit_limit !== null
        ? Number(credit_limit)
        : Number(initial_balance || 0);
      const insertPayload: any = {
        name,
        initial_balance: type === 'credito' ? cleanLimit : Number(initial_balance || 0),
        credit_limit: type === 'credito' ? cleanLimit : null,
        type,
        closing_day: type === 'credito' && closing_day ? Math.max(1, Math.min(31, Number(closing_day))) : null,
        due_day: type === 'credito' && due_day ? Math.max(1, Math.min(31, Number(due_day))) : null,
        user_id: user.id
      };

      let result = await supabase.from("financial_accounts").insert([insertPayload]).select().single();
      if (result.error && isFinMissingColumnError(result.error)) {
        result = await supabase.from("financial_accounts").insert([stripKeys(insertPayload, FIN_OPTIONAL_ACC_COLS)]).select().single();
      }
      if (result.error) return res.status(500).json(result.error);
      res.json({
        ...result.data,
        credit_limit: result.data?.type === 'credito' ? getAccountCreditLimit(result.data) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/finance/accounts/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, initial_balance, credit_limit, type, closing_day, due_day } = req.body;

      const { data: oldAcc } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", user.id)
        .single();

      const cleanLimit = credit_limit !== undefined && credit_limit !== '' && credit_limit !== null
        ? Number(credit_limit)
        : Number(initial_balance ?? oldAcc?.credit_limit ?? oldAcc?.initial_balance ?? 0);

      const cleanClosing = type === 'credito' && closing_day ? Math.max(1, Math.min(31, Number(closing_day))) : null;
      const cleanDue = type === 'credito' && due_day ? Math.max(1, Math.min(31, Number(due_day))) : null;

      const updatePayload: any = {
        name,
        initial_balance: type === 'credito' ? cleanLimit : Number(initial_balance || 0),
        credit_limit: type === 'credito' ? cleanLimit : null,
        type,
        closing_day: cleanClosing,
        due_day: cleanDue,
      };

      let result = await supabase
        .from("financial_accounts")
        .update(updatePayload)
        .eq("id", req.params.id)
        .eq("user_id", user.id);

      if (result.error && isFinMissingColumnError(result.error)) {
        result = await supabase
          .from("financial_accounts")
          .update(stripKeys(updatePayload, FIN_OPTIONAL_ACC_COLS))
          .eq("id", req.params.id)
          .eq("user_id", user.id);
      }

      if (result.error) return res.status(500).json(result.error);

      let recalculatedDueDates = 0;
      if (
        type === 'credito' &&
        cleanClosing &&
        cleanDue &&
        (Number(oldAcc?.closing_day) !== cleanClosing ||
          Number(oldAcc?.due_day) !== cleanDue ||
          oldAcc?.type !== 'credito')
      ) {
        recalculatedDueDates = await recalculateCardPendingDueDates(user.id, req.params.id, cleanClosing, cleanDue, 'pending');
      }

      res.json({ success: true, recalculated_due_dates: recalculatedDueDates });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/finance/accounts/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_accounts").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Responsibles
  app.get("/api/finance/responsibles", async (req, res) => { try { 
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_responsibles").select("*").eq("user_id", user.id).order('name');
    if (error) return res.status(500).json(error);
     res.json(data || []); } catch (err: any) { res.status(500).json({ error: err.message }); } });

  app.post("/api/finance/responsibles", async (req, res) => {
    const user = (req as any).user;
    const { name } = req.body;
    const { data, error } = await supabase.from("financial_responsibles").insert([{ name, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.delete("/api/finance/responsibles/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_responsibles").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Transactions
  app.get("/api/finance/transactions", async (req, res) => { 
    try { 
      const user = (req as any).user;
      const { data, error } = await supabase.from("financial_transactions")
        .select(`
          *,
          financial_categories (name),
          financial_accounts (name)
        `)
        .eq("user_id", user.id)
        .order('date', { ascending: false })
        .order('id', { ascending: false });
      
      if (error) return res.status(500).json(error);
      res.json(data || []); 
    } catch (err: any) { 
      res.status(500).json({ error: err.message }); 
    } 
  });

  app.post("/api/finance/transactions", async (req, res) => {
    try {
      const user = (req as any).user;
      const {
        description,
        amount,
        gross_amount,
        discount_amount,
        type,
        category_id,
        account_id,
        date,
        due_date,
        status,
        is_installment,
        total_installments,
        splits,
        is_transfer,
        transfer_account_id,
        transfer_group_id,
      } = req.body;

      const catId = category_id === '' ? null : category_id;
      const accId = account_id === '' ? null : account_id;
      const parsedNetAmount = round2(Number(amount) || 0);
      const parsedDiscount = round2(Number(discount_amount) || 0);
      const parsedGross = gross_amount != null ? round2(Number(gross_amount)) : round2(parsedNetAmount + parsedDiscount);
      const count = Math.max(1, Math.floor(Number(total_installments) || 1));
      const cleanDate = normalizeDateStr(date) || new Date().toISOString().split('T')[0];

      let account: any = null;
      if (accId) {
        const { data: accData } = await supabase
          .from("financial_accounts")
          .select("*")
          .eq("id", accId)
          .eq("user_id", user.id)
          .single();
        account = accData;
      }

      const isCard = account?.type === 'credito' && account?.closing_day && account?.due_day;

      if (is_installment && count > 1) {
        const installmentAmounts = distributeInstallmentsCents(parsedNetAmount, count);
        // Rule 8: All new installment purchases MUST initialize automatically as 'pendente'
        const installmentSplits = distributeSplitsCents(splits || [], count, undefined, true);

        const computeDueForIndex = (idx0: number) => {
          if (isCard) {
            return calculateCreditCardInvoiceDates(
              cleanDate,
              Number(account.closing_day),
              Number(account.due_day),
              idx0
            ).dueDateStr;
          }
          if (due_date) {
            return addMonthsPreservingDay(normalizeDateStr(due_date), idx0);
          }
          return null;
        };

        const firstRow: any = {
          description,
          amount: installmentAmounts[0],
          gross_amount: parsedGross,
          discount_amount: parsedDiscount,
          type,
          category_id: catId,
          account_id: accId,
          date: cleanDate,
          due_date: computeDueForIndex(0),
          status: 'pendente',
          user_id: user.id,
          is_installment: true,
          installment_number: 1,
          total_installments: count,
          parent_transaction_id: null,
          splits: installmentSplits[0] || [],
        };

        const { data: firstInserted, error: firstError } = await safeInsertFinTransactions([firstRow]);
        if (firstError || !firstInserted?.[0]) {
          return res.status(500).json(firstError || { error: "Failed to create installment #1" });
        }
        const firstInstallment = firstInserted[0];

        const subsequentInstallments: any[] = [];
        for (let i = 2; i <= count; i++) {
          subsequentInstallments.push({
            description,
            amount: installmentAmounts[i - 1],
            gross_amount: null,
            discount_amount: 0,
            type,
            category_id: catId,
            account_id: accId,
            date: addMonthsPreservingDay(cleanDate, i - 1),
            due_date: computeDueForIndex(i - 1),
            status: 'pendente',
            user_id: user.id,
            is_installment: true,
            installment_number: i,
            total_installments: count,
            parent_transaction_id: firstInstallment.id,
            splits: installmentSplits[i - 1] || [],
          });
        }

        if (subsequentInstallments.length > 0) {
          const { error: bulkError } = await safeInsertFinTransactions(subsequentInstallments);
          if (bulkError) console.error("Error creating subsequent installments:", bulkError);
        }

        return res.json(firstInstallment);
      } else {
        let calculatedDueDate = due_date ? normalizeDateStr(due_date) : null;
        if (!calculatedDueDate && isCard) {
          calculatedDueDate = calculateCreditCardInvoiceDates(
            cleanDate,
            Number(account.closing_day),
            Number(account.due_day),
            0
          ).dueDateStr;
        }

        const singleStatus = status === 'pendente' ? 'pendente' : 'pago';
        const cleanSplits = (Array.isArray(splits) ? splits : []).map((s: any) => ({
          name: String(s.name || '').trim(),
          amount: round2(Number(s.amount || 0)),
          status: s.status === 'pago' ? 'pago' : 'pendente',
        }));

        const singleRow: any = {
          description,
          amount: parsedNetAmount,
          gross_amount: parsedGross,
          discount_amount: parsedDiscount,
          type,
          category_id: catId,
          account_id: accId,
          date: cleanDate,
          due_date: calculatedDueDate,
          status: singleStatus,
          user_id: user.id,
          is_installment: false,
          installment_number: 1,
          total_installments: 1,
          parent_transaction_id: null,
          splits: cleanSplits,
          is_transfer: Boolean(is_transfer),
          transfer_account_id: transfer_account_id || null,
          transfer_group_id: transfer_group_id || null,
        };

        const { data, error } = await safeInsertFinTransactions([singleRow]);
        if (error || !data?.[0]) return res.status(500).json(error || { error: "Failed to insert transaction" });
        res.json(data[0]);
      }
    } catch (err: any) {
      console.error("Error in POST /api/finance/transactions:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Explicit Account-to-Account Transfer (neutralizes income/expense inflation)
  app.post("/api/finance/transfers", async (req, res) => {
    try {
      const user = (req as any).user;
      const { from_account_id, to_account_id, amount, date, description, status } = req.body;
      const transferAmount = round2(Number(amount) || 0);
      if (!from_account_id || !to_account_id) {
        return res.status(400).json({ error: "Selecione as contas de origem e destino." });
      }
      if (String(from_account_id) === String(to_account_id)) {
        return res.status(400).json({ error: "As contas de origem e destino devem ser diferentes." });
      }
      if (transferAmount <= 0) {
        return res.status(400).json({ error: "O valor da transferência deve ser maior que zero." });
      }

      const { data: accs } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("user_id", user.id)
        .in("id", [from_account_id, to_account_id]);

      const fromAcc = (accs || []).find((a: any) => String(a.id) === String(from_account_id));
      const toAcc = (accs || []).find((a: any) => String(a.id) === String(to_account_id));
      if (!fromAcc || !toAcc) {
        return res.status(404).json({ error: "Conta de origem ou destino não encontrada." });
      }
      if (fromAcc.type === 'credito' || toAcc.type === 'credito') {
        return res.status(400).json({ error: "Transferências só podem ocorrer entre contas correntes ou dinheiro. Para cartão, use Pagar Fatura." });
      }

      // Ensure Transferência categories exist for expense/income tagging & legacy detection
      const { data: userCats } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("user_id", user.id);

      const ensureTransferCat = async (catType: 'despesa' | 'receita') => {
        const existing = (userCats || []).find(
          (c: any) => c.type === catType && String(c.name || '').toLowerCase().includes('transfer')
        );
        if (existing) return existing.id;
        const { data: created } = await supabase
          .from("financial_categories")
          .insert([{ name: 'Transferência', type: catType, user_id: user.id }])
          .select()
          .single();
        return created?.id || null;
      };

      const [outCatId, inCatId] = await Promise.all([
        ensureTransferCat('despesa'),
        ensureTransferCat('receita'),
      ]);

      const cleanDate = normalizeDateStr(date) || new Date().toISOString().split('T')[0];
      const cleanStatus = status === 'pendente' ? 'pendente' : 'pago';
      const noteSuffix = description && String(description).trim() ? ` - ${String(description).trim()}` : '';
      const groupId = `TRF-${Date.now()}`;

      const rows = [
        {
          user_id: user.id,
          description: `Transferência para ${toAcc.name}${noteSuffix}`,
          amount: transferAmount,
          gross_amount: transferAmount,
          discount_amount: 0,
          type: 'despesa',
          category_id: outCatId,
          account_id: fromAcc.id,
          date: cleanDate,
          due_date: cleanDate,
          status: cleanStatus,
          is_installment: false,
          installment_number: 1,
          total_installments: 1,
          splits: [],
          is_transfer: true,
          transfer_account_id: toAcc.id,
          transfer_group_id: groupId,
        },
        {
          user_id: user.id,
          description: `Transferência de ${fromAcc.name}${noteSuffix}`,
          amount: transferAmount,
          gross_amount: transferAmount,
          discount_amount: 0,
          type: 'receita',
          category_id: inCatId,
          account_id: toAcc.id,
          date: cleanDate,
          due_date: cleanDate,
          status: cleanStatus,
          is_installment: false,
          installment_number: 1,
          total_installments: 1,
          splits: [],
          is_transfer: true,
          transfer_account_id: fromAcc.id,
          transfer_group_id: groupId,
        },
      ];

      const { data: inserted, error: insErr } = await safeInsertFinTransactions(rows);
      if (insErr) return res.status(500).json(insErr);
      res.json({ success: true, transfer_group_id: groupId, transactions: inserted || [] });
    } catch (err: any) {
      console.error("Error in POST /api/finance/transfers:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.put("/api/finance/transactions/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const id = req.params.id;
      const scope = String(req.query.scope || req.body.scope || 'single');
      const applyMode = String(req.body.apply_mode || 'per_installment');
      const updateData: any = {};

      const fields = [
        'description',
        'amount',
        'gross_amount',
        'discount_amount',
        'type',
        'category_id',
        'account_id',
        'date',
        'due_date',
        'status',
        'splits',
        'is_installment',
        'installment_number',
        'total_installments',
      ];
      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if ((field === 'category_id' || field === 'account_id') && req.body[field] === '') {
            updateData[field] = null;
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      const { data: currentTx, error: curErr } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (curErr || !currentTx) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const wasInstallment = Boolean(currentTx.is_installment && Number(currentTx.total_installments || 1) > 1);
      const requestedInstallment =
        updateData.is_installment !== undefined ? Boolean(updateData.is_installment) : Boolean(currentTx.is_installment);
      const requestedTotalCount =
        updateData.total_installments !== undefined
          ? Math.max(1, Math.floor(Number(updateData.total_installments) || 1))
          : Math.max(1, Number(currentTx.total_installments || 1));

      const convertingSingleToInstallments = !wasInstallment && requestedInstallment && requestedTotalCount > 1;

      if (scope === 'single' && !convertingSingleToInstallments) {
        const targetAccId = updateData.account_id !== undefined ? updateData.account_id : currentTx.account_id;
        const targetDate = normalizeDateStr(updateData.date !== undefined ? updateData.date : currentTx.date);

        if (
          (updateData.account_id !== undefined || updateData.date !== undefined) &&
          updateData.due_date === undefined &&
          targetAccId
        ) {
          const { data: accData } = await supabase
            .from("financial_accounts")
            .select("*")
            .eq("id", targetAccId)
            .eq("user_id", user.id)
            .single();
          if (accData?.type === 'credito' && accData.closing_day && accData.due_day) {
            const instOffset = currentTx.is_installment ? Math.max(0, Number(currentTx.installment_number || 1) - 1) : 0;
            // If only this single installment's date or account moved, compute directly with offset 0 from targetDate when date was changed for non-installment or offset from anchor when installment
            const invInfo = calculateCreditCardInvoiceDates(
              targetDate,
              Number(accData.closing_day),
              Number(accData.due_day),
              currentTx.is_installment && updateData.date === undefined ? instOffset : 0
            );
            updateData.due_date = invInfo.dueDateStr;
          }
        }

        if (updateData.amount !== undefined) {
          updateData.amount = round2(Number(updateData.amount) || 0);
        }
        if (updateData.gross_amount !== undefined) {
          updateData.gross_amount = round2(Number(updateData.gross_amount) || 0);
        }
        if (updateData.discount_amount !== undefined) {
          updateData.discount_amount = round2(Number(updateData.discount_amount) || 0);
        }

        const { error } = await safeUpdateFinTransaction(id, user.id, updateData);
        if (error) return res.status(500).json(error);
        return res.json({ success: true });
      }

      // Multi-installment or 1x <-> Nx purchase edit
      const parentId = currentTx.parent_transaction_id || currentTx.id;
      let allSiblings: any[] = [];
      if (wasInstallment) {
        const { data: sibData, error: sibErr } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("user_id", user.id)
          .or(`id.eq.${parentId},parent_transaction_id.eq.${parentId}`)
          .order("installment_number", { ascending: true })
          .order("id", { ascending: true });

        if (sibErr || !sibData) {
          return res.status(500).json(sibErr || { error: "Failed to load siblings" });
        }
        allSiblings = sibData;
      } else {
        allSiblings = [currentTx];
      }

      const currentInstNum = Number(currentTx.installment_number || 1);
      const effectiveScope = convertingSingleToInstallments ? 'all' : scope;
      const targetSiblings =
        effectiveScope === 'future'
          ? allSiblings.filter((s: any) => Number(s.installment_number || 1) >= currentInstNum)
          : allSiblings;

      const targetCount =
        effectiveScope === 'all'
          ? requestedInstallment && requestedTotalCount > 1
            ? requestedTotalCount
            : 1
          : targetSiblings.length;

      const targetAccId = updateData.account_id !== undefined ? updateData.account_id : currentTx.account_id;
      let targetAccount: any = null;
      if (targetAccId) {
        const { data: accData } = await supabase
          .from("financial_accounts")
          .select("*")
          .eq("id", targetAccId)
          .eq("user_id", user.id)
          .single();
        targetAccount = accData;
      }
      const isCard = targetAccount?.type === 'credito' && targetAccount?.closing_day && targetAccount?.due_day;

      // Determine anchor date: for 'all', updateData.date IS installment #1's purchase date; for 'future', updateData.date is currentTx's date
      const baseAnchorDate =
        effectiveScope === 'all'
          ? normalizeDateStr(updateData.date || allSiblings[0].date)
          : normalizeDateStr(updateData.date || currentTx.date);

      let distributedAmounts: number[] | null = null;
      if (updateData.amount !== undefined) {
        const numericAmount = round2(Number(updateData.amount) || 0);
        if (applyMode === 'total' || convertingSingleToInstallments) {
          distributedAmounts = distributeInstallmentsCents(numericAmount, targetCount);
        } else {
          distributedAmounts = Array.from({ length: targetCount }, () => numericAmount);
        }
      }

      let distributedSplits: any[][] | null = null;
      if (Array.isArray(updateData.splits)) {
        const existingPerInst = Array.from({ length: targetCount }, (_, i) => targetSiblings[i]?.splits || []);
        if (applyMode === 'total' || convertingSingleToInstallments) {
          distributedSplits = distributeSplitsCents(updateData.splits, targetCount, existingPerInst, false);
        } else {
          distributedSplits = Array.from({ length: targetCount }, (_, i) => {
            const ex = existingPerInst[i] || [];
            return updateData.splits.map((s: any) => {
              const matched = ex.find((e: any) => String(e.name || '').trim().toLowerCase() === String(s.name || '').trim().toLowerCase());
              return {
                name: String(s.name || '').trim(),
                amount: round2(Number(s.amount || 0)),
                status: matched?.status || s.status || 'pendente',
              };
            });
          });
        }
      }

      const anchorSibling = targetSiblings[0] || currentTx;
      const groupParentId = anchorSibling.id;

      const computeDateForIdx = (idx: number) => {
        if (effectiveScope === 'all') {
          return addMonthsPreservingDay(baseAnchorDate, idx);
        }
        const sibInstNum = Number(targetSiblings[idx]?.installment_number || currentInstNum + idx);
        return addMonthsPreservingDay(baseAnchorDate, sibInstNum - currentInstNum);
      };

      const computeDueForIdx = (idx: number, sibDate: string, prevDue?: string | null) => {
        if (isCard) {
          if (effectiveScope === 'all') {
            return calculateCreditCardInvoiceDates(
              baseAnchorDate,
              Number(targetAccount.closing_day),
              Number(targetAccount.due_day),
              idx
            ).dueDateStr;
          }
          const sibInstNum = Number(targetSiblings[idx]?.installment_number || currentInstNum + idx);
          const inferredPurchaseDate = addMonthsPreservingDay(baseAnchorDate, -(currentInstNum - 1));
          return calculateCreditCardInvoiceDates(
            inferredPurchaseDate,
            Number(targetAccount.closing_day),
            Number(targetAccount.due_day),
            sibInstNum - 1
          ).dueDateStr;
        }
        if (updateData.due_date) {
          const offset = effectiveScope === 'all' ? idx : Number(targetSiblings[idx]?.installment_number || currentInstNum + idx) - currentInstNum;
          return addMonthsPreservingDay(normalizeDateStr(updateData.due_date), offset);
        }
        return prevDue ?? sibDate;
      };

      const keepCount = Math.min(targetCount, targetSiblings.length);
      let updatedCount = 0;

      // 1. Update kept existing installments (ALWAYS preserving individual status!)
      for (let idx = 0; idx < keepCount; idx++) {
        const sib = targetSiblings[idx];
        const patch: any = {};

        ['description', 'category_id', 'account_id', 'type'].forEach((f) => {
          if (updateData[f] !== undefined) patch[f] = updateData[f];
        });

        if (distributedAmounts) {
          patch.amount = distributedAmounts[idx];
        }
        if (distributedSplits) {
          patch.splits = distributedSplits[idx];
        }

        if (idx === 0) {
          if (updateData.gross_amount !== undefined) patch.gross_amount = round2(Number(updateData.gross_amount));
          if (updateData.discount_amount !== undefined) patch.discount_amount = round2(Number(updateData.discount_amount));
        } else {
          if (updateData.gross_amount !== undefined) patch.gross_amount = null;
          if (updateData.discount_amount !== undefined) patch.discount_amount = 0;
        }

        const newSibDate = updateData.date !== undefined || effectiveScope === 'all' ? computeDateForIdx(idx) : normalizeDateStr(sib.date);
        patch.date = newSibDate;

        if (isCard || updateData.due_date !== undefined || updateData.date !== undefined || updateData.account_id !== undefined) {
          patch.due_date = computeDueForIdx(idx, newSibDate, sib.due_date);
        }

        if (effectiveScope === 'all') {
          if (targetCount > 1) {
            patch.is_installment = true;
            patch.installment_number = idx + 1;
            patch.total_installments = targetCount;
            patch.parent_transaction_id = idx === 0 ? null : groupParentId;
          } else {
            // Converted Nx -> 1x
            patch.is_installment = false;
            patch.installment_number = 1;
            patch.total_installments = 1;
            patch.parent_transaction_id = null;
          }
        }

        // Preserve existing payment status on kept installments when editing an installment purchase;
        // if converted to single (targetCount === 1) or converting 1x -> Nx, rule 8 handles new installments as pendente.
        if (convertingSingleToInstallments) {
          patch.status = idx === 0 && sib.status === 'pago' ? 'pago' : 'pendente';
        }

        const { error: uErr } = await safeUpdateFinTransaction(sib.id, user.id, patch);
        if (uErr) return res.status(500).json(uErr);
        updatedCount++;
      }

      // 2. Insert new installments if count increased (all start as 'pendente' per Rule 8!)
      if (effectiveScope === 'all' && targetCount > targetSiblings.length) {
        const newRows: any[] = [];
        for (let idx = targetSiblings.length; idx < targetCount; idx++) {
          const newDate = computeDateForIdx(idx);
          const newDue = computeDueForIdx(idx, newDate, null);
          const fallbackAmt = distributedAmounts ? distributedAmounts[idx] : round2(Number(anchorSibling.amount || 0));
          const fallbackSplits = distributedSplits
            ? distributedSplits[idx].map((sp: any) => ({ ...sp, status: 'pendente' }))
            : [];

          newRows.push({
            user_id: user.id,
            description: updateData.description ?? anchorSibling.description,
            amount: fallbackAmt,
            gross_amount: null,
            discount_amount: 0,
            type: updateData.type ?? anchorSibling.type,
            category_id: updateData.category_id !== undefined ? updateData.category_id : anchorSibling.category_id,
            account_id: targetAccId,
            date: newDate,
            due_date: newDue,
            status: 'pendente',
            is_installment: true,
            installment_number: idx + 1,
            total_installments: targetCount,
            parent_transaction_id: groupParentId,
            splits: fallbackSplits,
          });
        }
        if (newRows.length > 0) {
          const { error: insErr } = await safeInsertFinTransactions(newRows);
          if (insErr) return res.status(500).json(insErr);
          updatedCount += newRows.length;
        }
      }

      // 3. Remove excess installments if count decreased (e.g. 6x -> 4x or 3x -> 1x)
      if (effectiveScope === 'all' && targetSiblings.length > targetCount) {
        const excessIds = targetSiblings.slice(targetCount).map((s: any) => s.id);
        if (excessIds.length > 0) {
          const { error: delErr } = await supabase
            .from("financial_transactions")
            .delete()
            .eq("user_id", user.id)
            .in("id", excessIds);
          if (delErr) return res.status(500).json(delErr);
        }
      }

      res.json({ success: true, updated_count: updatedCount });
    } catch (err: any) {
      console.error("Error in PUT /api/finance/transactions:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.delete("/api/finance/transactions/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const id = req.params.id;
      const scope = req.query.scope || 'all';

      const { data: transaction, error: fetchError } = await supabase
        .from("financial_transactions")
        .select("id, is_installment, parent_transaction_id, installment_number")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) return res.status(500).json(fetchError);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });

      if (!transaction.is_installment || scope === 'single') {
        if (transaction.is_installment && !transaction.parent_transaction_id) {
          const { data: children } = await supabase
            .from("financial_transactions")
            .select("id")
            .eq("parent_transaction_id", transaction.id)
            .order("installment_number", { ascending: true });

          if (children && children.length > 0) {
            const newParentId = children[0].id;
            await supabase.from("financial_transactions").update({ parent_transaction_id: null }).eq("id", newParentId);
            if (children.length > 1) {
              const remainingChildIds = children.slice(1).map((c: any) => c.id);
              await supabase.from("financial_transactions").update({ parent_transaction_id: newParentId }).in("id", remainingChildIds);
            }
          }
        }

        const { error } = await supabase.from("financial_transactions").delete().eq("id", id).eq("user_id", user.id);
        if (error) return res.status(500).json(error);
        return res.json({ success: true });
      }

      const parentId = transaction.parent_transaction_id || transaction.id;

      if (scope === 'future') {
        const currentInstNum = transaction.installment_number || 1;
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("user_id", user.id)
          .or(`id.eq.${parentId},parent_transaction_id.eq.${parentId}`)
          .gte("installment_number", currentInstNum);

        if (error) return res.status(500).json(error);
        return res.json({ success: true });
      }

      // Default: scope === 'all'
      await supabase.from("financial_transactions").delete().eq("parent_transaction_id", parentId).eq("user_id", user.id);
      const { error } = await supabase.from("financial_transactions").delete().eq("id", parentId).eq("user_id", user.id);
      if (error) return res.status(500).json(error);

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in DELETE /api/finance/transactions:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Bulk Recalculate Credit Card Due Dates
  app.post("/api/finance/recalculate-credit-dates", async (req, res) => {
    try {
      const user = (req as any).user;
      const mode: 'pending' | 'all' = req.body?.mode === 'all' ? 'all' : 'pending';
      const targetAccountId = req.body?.account_id;

      let accQuery = supabase
        .from("financial_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "credito");
      if (targetAccountId) accQuery = accQuery.eq("id", targetAccountId);

      const { data: cards, error: cardErr } = await accQuery;
      if (cardErr) return res.status(500).json(cardErr);

      let totalUpdated = 0;
      for (const card of cards || []) {
        if (card.closing_day && card.due_day) {
          totalUpdated += await recalculateCardPendingDueDates(
            user.id,
            card.id,
            Number(card.closing_day),
            Number(card.due_day),
            mode
          );
        }
      }

      res.json({ success: true, updated_count: totalUpdated });
    } catch (err: any) {
      console.error("Error in /api/finance/recalculate-credit-dates:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Credit Card Invoice Settlement
  app.post("/api/finance/pay-invoice", async (req, res) => {
    try {
      const user = (req as any).user;
      const { card_account_id, paying_account_id, month, year, payment_date } = req.body;

      if (!card_account_id) {
        return res.status(400).json({ error: "card_account_id is required" });
      }

      const { data: card } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("id", card_account_id)
        .eq("user_id", user.id)
        .single();

      if (!card) {
        return res.status(404).json({ error: "Cartão não encontrado" });
      }
      if (card.type !== 'credito') {
        return res.status(400).json({ error: "A conta selecionada não é um cartão de crédito." });
      }

      const { data: allTxs } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_id", card_account_id);

      const targetMonth = Number(month);
      const targetYear = Number(year);

      const invoiceItemsToPay: any[] = [];
      let totalAmountToPay = 0;

      (allTxs || []).forEach((t: any) => {
        const belongs = doesTransactionBelongToCompetence(t, card, targetYear, targetMonth);
        if (belongs && t.status !== 'pago') {
          invoiceItemsToPay.push(t);
          if (t.type === 'despesa') {
            totalAmountToPay = round2(totalAmountToPay + Number(t.amount || 0));
          } else {
            totalAmountToPay = round2(totalAmountToPay - Number(t.amount || 0));
          }
        }
      });

      if (invoiceItemsToPay.length === 0) {
        return res.status(400).json({ error: "Não há lançamentos pendentes nesta fatura." });
      }

      for (const tx of invoiceItemsToPay) {
        const updatedSplits = (tx.splits || []).map((s: any) => ({ ...s, status: 'pago' }));
        await supabase
          .from("financial_transactions")
          .update({ status: 'pago', splits: updatedSplits })
          .eq("id", tx.id)
          .eq("user_id", user.id);
      }

      // Record liquid bank/cash outflow without double-counting monthly expenses
      if (paying_account_id && String(paying_account_id) !== String(card_account_id) && totalAmountToPay > 0) {
        const { data: payAcc } = await supabase
          .from("financial_accounts")
          .select("*")
          .eq("id", paying_account_id)
          .eq("user_id", user.id)
          .single();

        if (payAcc && payAcc.type !== 'credito') {
          const payDate = normalizeDateStr(payment_date) || new Date().toISOString().split('T')[0];
          const compLabel = `${String(targetMonth + 1).padStart(2, '0')}/${targetYear}`;
          const { data: faturaCats } = await supabase
            .from("financial_categories")
            .select("id, name")
            .eq("user_id", user.id)
            .eq("type", "despesa");
          let matchedCat = (faturaCats || []).find((c: any) => c.name?.toLowerCase().includes('fatura'));
          if (!matchedCat) {
            const { data: createdCat } = await supabase
              .from("financial_categories")
              .insert([{ name: 'Pagamento de Fatura', type: 'despesa', user_id: user.id }])
              .select()
              .single();
            matchedCat = createdCat;
          }

          await safeInsertFinTransactions([{
            user_id: user.id,
            description: `Pagamento Fatura ${card.name} (${compLabel})`,
            amount: round2(totalAmountToPay),
            gross_amount: round2(totalAmountToPay),
            discount_amount: 0,
            type: 'despesa',
            category_id: matchedCat?.id || null,
            account_id: payAcc.id,
            date: payDate,
            due_date: payDate,
            status: 'pago',
            is_installment: false,
            installment_number: 1,
            total_installments: 1,
            splits: []
          }]);
        }
      }

      res.json({
        success: true,
        paid_items_count: invoiceItemsToPay.length,
        total_paid: round2(Math.max(0, totalAmountToPay)),
      });
    } catch (err: any) {
      console.error("Error in /api/finance/pay-invoice:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Controlled Reset of Operational Financial Data
  app.post("/api/finance/reset", async (req, res) => {
    try {
      const user = (req as any).user;
      const { confirm } = req.body;
      if (!confirm) {
        return res.status(400).json({ error: "Confirmation required" });
      }

      console.log(`[FINANCE RESET] Initiated by user ${user.id}`);
      await supabase.from("financial_transactions").delete().eq("user_id", user.id).not("parent_transaction_id", "is", null);
      await supabase.from("financial_transactions").delete().eq("user_id", user.id);
      await supabase.from("fixed_bill_payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      res.json({
        success: true,
        message: "Módulo financeiro reinicializado com sucesso! Todos os lançamentos operacionais foram removidos, mantendo suas contas, cartões e categorias intactos."
      });
    } catch (err: any) {
      console.error("Error in /api/finance/reset:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Dashboard Summary (Canonical Engine)
  app.get("/api/finance/dashboard", async (req, res) => {
    try {
      const user = (req as any).user;
      const { month, year } = req.query;

      const now = new Date();
      const filterMonth = month !== undefined ? Number(month) : now.getMonth();
      const filterYear = year !== undefined ? Number(year) : now.getFullYear();

      const [{ data: accounts, error: aError }, { data: categories }, { data: transactions, error: tError }] =
        await Promise.all([
          supabase.from("financial_accounts").select("*").eq("user_id", user.id),
          supabase.from("financial_categories").select("*").eq("user_id", user.id),
          supabase.from("financial_transactions").select("*").eq("user_id", user.id),
        ]);

      if (aError) return res.status(500).json(aError);
      if (tError) return res.status(500).json(tError);

      const normalizedAccounts = (accounts || []).map((acc: any) => ({
        ...acc,
        credit_limit: acc.type === 'credito' ? getAccountCreditLimit(acc) : (acc.credit_limit ?? null),
      }));

      const dashboard = computeFinancialDashboard({
        transactions: (transactions || []) as any,
        accounts: normalizedAccounts as any,
        categories: (categories || []) as any,
        month: filterMonth,
        year: filterYear,
      });

      res.json(dashboard);
    } catch (error: any) {
      console.error("Error in /api/finance/dashboard:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });


  // --- Client Module Routes ---

  // Clients
  app.get("/api/clients", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("clients")
      .select(`
        *,
        client_sales (purchase_date)
      `)
      .eq("user_id", user.id)
      .order('name');
    
    if (error) return res.status(500).json(error);
    
    // Process data to find the most recent purchase date for each client
    const processedData = (data || []).map((client: any) => {
      const sales = client.client_sales || [];
      const lastPurchase = sales.length > 0 
        ? sales.reduce((latest: string, current: any) => 
            current.purchase_date > latest ? current.purchase_date : latest, 
          sales[0].purchase_date)
        : null;
      
      const { client_sales, ...clientData } = client;
      return { ...clientData, last_purchase: lastPurchase };
    });

    res.json(processedData);
  });

  app.post("/api/clients", async (req, res) => {
    const user = (req as any).user;
    const { name, phone } = req.body;
    const { data, error } = await supabase.from("clients").insert([{ name, phone, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/clients/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, phone } = req.body;
    const { error } = await supabase.from("clients").update({ name, phone }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/clients/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("clients").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Client Sales
  app.get("/api/client-sales", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("client_sales")
      .select(`
        *,
        clients (name)
      `)
      .eq("user_id", user.id)
      .order('purchase_date', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/client-sales", async (req, res) => {
    const user = (req as any).user;
    const { client_id, description, total_amount, installment_count, purchase_date, due_day } = req.body;
    
    // 1. Create Sale
    const { data: sale, error: saleError } = await supabase.from("client_sales").insert([{
      client_id,
      description,
      total_amount,
      installment_count,
      purchase_date,
      due_day,
      user_id: user.id
    }]).select().single();

    if (saleError) return res.status(500).json(saleError);

    // 2. Generate Installments
    const installments = [];
    const installmentAmount = Number((total_amount / installment_count).toFixed(2));
    const purchaseDateObj = new Date(purchase_date);
    
    for (let i = 1; i <= installment_count; i++) {
      // Calculate due date: next month on due_day
      const dueDate = new Date(purchaseDateObj.getFullYear(), purchaseDateObj.getMonth() + i, due_day);
      
      installments.push({
        sale_id: sale.id,
        installment_number: i,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pendente',
        user_id: user.id
      });
    }

    const { error: instError } = await supabase.from("client_installments").insert(installments);
    if (instError) {
      console.error("Error creating installments:", instError);
      // Ideally rollback sale here, but for simplicity we'll just log
    }

    res.json(sale);
  });

  app.delete("/api/client-sales/:id", async (req, res) => {
    const user = (req as any).user;
    // Cascade delete handles installments
    const { error } = await supabase.from("client_sales").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Client Installments (Dashboard)
  app.get("/api/client-installments", async (req, res) => {
    const user = (req as any).user;
    const { month, year, client_id } = req.query;

    let query = supabase.from("client_installments")
      .select(`
        *,
        client_sales (
          description,
          installment_count,
          clients (name, phone)
        )
      `)
      .eq("user_id", user.id)
      .order('due_date');

    if (month && year) {
      const startDate = new Date(Number(year), Number(month), 1).toISOString().split('T')[0];
      const endDate = new Date(Number(year), Number(month) + 1, 0).toISOString().split('T')[0];
      query = query.gte('due_date', startDate).lte('due_date', endDate);
    }

    if (client_id) {
      // Filter by client requires join filtering, which is tricky in simple query.
      // Easier to filter in memory or use a more complex query.
      // For now, let's filter in memory if needed or rely on frontend.
    }

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    
    // Filter by client_id in memory if provided (since it's nested)
    let filteredData = data || [];
    if (client_id) {
      filteredData = filteredData.filter((item: any) => item.client_sales?.client_id === Number(client_id));
    }

    res.json(filteredData);
  });

  app.put("/api/client-installments/:id", async (req, res) => {
    const user = (req as any).user;
    const { status, payment_date, amount, due_date } = req.body;
    
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (payment_date !== undefined) updateData.payment_date = payment_date;
    if (amount !== undefined) updateData.amount = amount;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { error } = await supabase.from("client_installments")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("user_id", user.id);
      
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/client-installments/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("client_installments")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // --- Marketing Module Routes ---

  // Marketing Clients
  app.get("/api/marketing/clients", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase.from("marketing_clients")
        .select("*")
        .eq("user_id", user.id)
        .order('name');
      
      if (error) {
        console.error("marketing_clients select error:", error);
        return res.json([]);
      }
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/marketing/clients", async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, company, phone, plan_name, plan_value, status, publication_days } = req.body;
      const { data, error } = await supabase.from("marketing_clients").insert([{
        user_id: user.id,
        name,
        company,
        phone,
        plan_name,
        plan_value: plan_value || 0,
        status: status || 'ativo',
        publication_days: publication_days || ''
      }]).select().single();
      
      if (error) return res.status(500).json(error);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/marketing/clients/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { name, company, phone, plan_name, plan_value, status, publication_days } = req.body;
      const { error } = await supabase.from("marketing_clients")
        .update({ name, company, phone, plan_name, plan_value, status, publication_days })
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      if (error) return res.status(500).json(error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/marketing/clients/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { error } = await supabase.from("marketing_clients")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      if (error) return res.status(500).json(error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Marketing Payments
  app.get("/api/marketing/payments", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase.from("marketing_payments")
        .select(`
          *,
          marketing_clients (name, company, phone)
        `)
        .eq("user_id", user.id)
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error("marketing_payments select error:", error);
        return res.json([]);
      }
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/marketing/payments", async (req, res) => {
    try {
      const user = (req as any).user;
      const { client_id, month_reference, amount, due_date, payment_date, status } = req.body;
      const { data, error } = await supabase.from("marketing_payments").insert([{
        user_id: user.id,
        client_id,
        month_reference,
        amount,
        due_date,
        payment_date,
        status: status || 'pendente'
      }]).select().single();
      
      if (error) return res.status(500).json(error);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/marketing/payments/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { client_id, month_reference, amount, due_date, payment_date, status } = req.body;
      const { error } = await supabase.from("marketing_payments")
        .update({ client_id, month_reference, amount, due_date, payment_date, status })
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      if (error) return res.status(500).json(error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/marketing/payments/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { error } = await supabase.from("marketing_payments")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      if (error) return res.status(500).json(error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper for status encoding and database constraint resilience
  const encodeStatusInCaption = (caption: string | undefined | null, status: string) => {
    const cleanCaption = (caption || '').replace(/^\[STATUS:[a-z_]+\]\n?/i, '');
    return `[STATUS:${status}]\n${cleanCaption}`;
  };

  const decodePostStatus = (post: any) => {
    if (!post) return post;
    let status = post.status;
    let caption = post.caption || '';
    
    const match = caption.match(/^\[STATUS:([a-z_]+)\]\n?/i);
    if (match) {
      status = match[1];
      caption = caption.replace(/^\[STATUS:[a-z_]+\]\n?/i, '');
    } else if (status === 'agendado') {
      status = 'programado';
    }
    
    return {
      ...post,
      status: status || 'rascunho',
      caption
    };
  };

  // Marketing Posts
  app.get("/api/marketing/posts", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase.from("marketing_posts")
        .select("*")
        .eq("user_id", user.id)
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error("marketing_posts select error:", error);
        return res.json([]);
      }
      
      const mapped = (data || []).map((post: any) => decodePostStatus(post));

      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/marketing/posts", async (req, res) => {
    try {
      const user = (req as any).user;
      const { title, scheduled_date, scheduled_time, social_network, status, caption, attachment_url, client_id } = req.body;
      console.log("POST marketing_posts request body:", req.body);
      
      const cleanCaption = (caption || '').replace(/^\[STATUS:[a-z_]+\]\n?/i, '');
      const desiredStatus = status || 'rascunho';

      const payload: any = {
        user_id: user.id,
        title,
        scheduled_date,
        scheduled_time,
        social_network,
        status: desiredStatus,
        caption: cleanCaption,
        attachment_url,
        client_id: client_id || null
      };

      let { data, error } = await supabase.from("marketing_posts").insert([payload]).select().single();
      
      // Handle status check constraint violation if DB has restricted status ENUM/CHECK
      if (error && error.code === '23514') {
        const fallbackStatus = desiredStatus === 'rascunho' ? 'rascunho' : (desiredStatus === 'publicado' ? 'publicado' : 'agendado');
        payload.status = fallbackStatus;
        payload.caption = encodeStatusInCaption(cleanCaption, desiredStatus);
        const retryResult = await supabase.from("marketing_posts").insert([payload]).select().single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("marketing_posts insert error:", error);
        return res.status(500).json({ error: error.message || "Erro ao salvar post no banco de dados" });
      }

      res.json(decodePostStatus(data));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/marketing/posts/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { title, scheduled_date, scheduled_time, social_network, status, caption, attachment_url, client_id } = req.body;
      console.log("PUT marketing_posts request body:", req.body);
      
      const cleanCaption = (caption || '').replace(/^\[STATUS:[a-z_]+\]\n?/i, '');
      const desiredStatus = status || 'rascunho';

      const updateData: any = { 
        title, 
        scheduled_date, 
        scheduled_time, 
        social_network, 
        status: desiredStatus, 
        caption: cleanCaption, 
        attachment_url, 
        client_id: client_id || null 
      };

      let { error } = await supabase.from("marketing_posts")
        .update(updateData)
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      // If DB has old check constraint on status column, retry with fallback status and encoded caption
      if (error && error.code === '23514') {
        const fallbackStatus = desiredStatus === 'rascunho' ? 'rascunho' : (desiredStatus === 'publicado' ? 'publicado' : 'agendado');
        updateData.status = fallbackStatus;
        updateData.caption = encodeStatusInCaption(cleanCaption, desiredStatus);
        const retryResult = await supabase.from("marketing_posts")
          .update(updateData)
          .eq("id", req.params.id)
          .eq("user_id", user.id);
        error = retryResult.error;
      }

      if (error) {
        console.error("marketing_posts update error:", error);
        return res.status(500).json({ error: error.message || "Erro ao atualizar post" });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/marketing/posts/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { error } = await supabase.from("marketing_posts")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", user.id);
      
      if (error) return res.status(500).json(error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI-powered Caption Generation endpoint
  app.post("/api/ai/generate-caption", async (req, res) => {
    try {
      if (!ai) {
        return res.status(501).json({ error: "O serviço Gemini AI não está configurado ou a chave de API está ausente no servidor." });
      }

      const { title, social_network, context } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Por favor, informe o título ou tema do post." });
      }

      console.log(`Generating AI caption with Gemini for post: "${title}" (${social_network})`);

      const prompt = `Você é um especialista em marketing digital e redação publicitária (copywriting).
Escreva uma legenda atraente, persuasiva e altamente profissional em português para uma postagem com o seguinte tema/título: "${title}".
Rede Social de destino: ${social_network || 'Instagram'}.
Contexto adicional ou público-alvo: ${context || 'Geral'}.

Diretrizes da legenda:
1. Comece com um gancho forte (headline) para prender a atenção de imediato.
2. Divida o texto em parágrafos curtos para tornar a leitura escaneável e agradável.
3. Inclua uma chamada para ação (CTA) marcante e apropriada no final (ex: "Deixe seu comentário", "Acesse o link da nossa bio", "Compartilhe com quem precisa saber disso").
4. Adicione hashtags relevantes e estratégicas ao final da legenda.
5. Use emojis de forma moderada e profissional para animar e humanizar a mensagem.

Retorne APENAS o texto da legenda formatada, sem comentários extras, introduções do tipo "Aqui está a legenda" ou blocos de código formatados com crase.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      const caption = response.text || '';
      res.json({ caption: caption.trim() });
    } catch (err: any) {
      console.error("Error generating AI caption with Gemini:", err);
      res.status(500).json({ error: err.message || "Erro ao gerar legenda com inteligência artificial." });
    }
  });

  // Marketing File Upload (supports up to 50MB via Base64 JSON)
  app.post("/api/marketing/upload", async (req, res) => {
    try {
      const { fileName, fileType, fileData } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "Nome ou dados do arquivo ausentes." });
      }

      if (process.env.VERCEL) {
        return res.json({
          success: true,
          url: fileData,
          fileName: fileName
        });
      }

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Base64 decode
      const base64Data = fileData.replace(/^data:.*;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Check size limit (50MB)
      const maxBytes = 50 * 1024 * 1024;
      if (buffer.length > maxBytes) {
        return res.status(400).json({ error: "O arquivo excede o limite permitido de 50MB." });
      }

      // Generate unique name
      const fileExt = path.extname(fileName) || "";
      const baseName = path.basename(fileName, fileExt).replace(/[^a-zA-Z0-9]/g, "_");
      const uniqueFileName = `${Date.now()}_${baseName}${fileExt}`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      fs.writeFileSync(filePath, buffer);

      res.json({ 
        success: true, 
        url: `/uploads/${uniqueFileName}`,
        fileName: uniqueFileName
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Chácara Module Helpers & Routes ---
  const cleanAddressNumber = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    // Remove "Rua", "Casa", "Alameda", "Lote", "Lt", "Chácara", "Quadra", "Qd", "Nº", "No", etc.
    str = str.replace(/\b(rua|casa|alameda|lote|lt|chacara|chácara|quadra|qd|nº|no|num|numero|número)\b/gi, '');
    str = str.replace(/^(r\.|c\.|lt\.|qd\.|n\.|no\.)\s*/gi, '');
    str = str.replace(/^(rua|casa|r|c)\s*[:\-.]?\s*/i, '');
    str = str.replace(/^[\s:\-./,]+|[\s:\-./,]+$/g, '').trim();
    return str;
  };

  const encodeChacaraUserPhone = (phone: string, meta: { street?: string; house_number?: string; cpf?: string; energy_meter_statuses?: boolean[]; water_meter_statuses?: boolean[] }) => {
    const cleanPhone = (phone || "").replace(/^\[META:[^\]]+\]\n?/is, "");
    const cleanStreet = cleanAddressNumber(meta.street);
    const cleanHouse = cleanAddressNumber(meta.house_number);
    if (!cleanStreet && !cleanHouse && !meta.cpf && !meta.energy_meter_statuses && !meta.water_meter_statuses) {
      return cleanPhone;
    }
    const jsonMeta = JSON.stringify({
      street: cleanStreet,
      house_number: cleanHouse,
      cpf: meta.cpf || "",
      energy_meter_statuses: meta.energy_meter_statuses,
      water_meter_statuses: meta.water_meter_statuses
    });
    return `[META:${jsonMeta}]\n${cleanPhone}`;
  };

  const decodeChacaraUser = (u: any) => {
    if (!u) return u;
    let street = cleanAddressNumber(u.street || u.rua || "");
    let house_number = cleanAddressNumber(u.house_number || u.casa || "");
    let cpf = u.cpf || "";
    let phone = u.phone || "";
    let energy_meter_statuses = u.energy_meter_statuses;
    let water_meter_statuses = u.water_meter_statuses;

    const match = phone.match(/^\[META:([^\]]+)\]\n?(.*)$/s);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (!street && meta.street) street = cleanAddressNumber(meta.street);
        if (!house_number && meta.house_number) house_number = cleanAddressNumber(meta.house_number);
        if (!cpf && meta.cpf) cpf = meta.cpf;
        if (!energy_meter_statuses && meta.energy_meter_statuses) energy_meter_statuses = meta.energy_meter_statuses;
        if (!water_meter_statuses && meta.water_meter_statuses) water_meter_statuses = meta.water_meter_statuses;
        phone = match[2] || "";
      } catch (e) {
        console.error("Error decoding chacara user metadata:", e);
      }
    }

    return {
      ...u,
      phone,
      street,
      house_number,
      cpf,
      energy_meter_statuses,
      water_meter_statuses
    };
  };

  app.get("/api/chacara/users", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_users").select("*").eq("user_id", user.id).order('name');
    if (error) return res.status(500).json(error);
    const mapped = (data || []).map((u: any) => decodeChacaraUser(u));

    // Asynchronously update records in DB if they still contained literal "Rua" or "Casa"
    (async () => {
      try {
        for (const rawUser of (data || [])) {
          const decoded = decodeChacaraUser(rawUser);
          const needsStreetUpdate = rawUser.street && rawUser.street !== decoded.street;
          const needsHouseUpdate = rawUser.house_number && rawUser.house_number !== decoded.house_number;
          const needsRuaUpdate = rawUser.rua && rawUser.rua !== decoded.street;
          const needsCasaUpdate = rawUser.casa && rawUser.casa !== decoded.house_number;

          if (needsStreetUpdate || needsHouseUpdate || needsRuaUpdate || needsCasaUpdate) {
            const patch: any = {};
            if (rawUser.street !== undefined) patch.street = decoded.street;
            if (rawUser.house_number !== undefined) patch.house_number = decoded.house_number;
            if (rawUser.rua !== undefined) patch.rua = decoded.street;
            if (rawUser.casa !== undefined) patch.casa = decoded.house_number;
            await supabase.from("chacara_users").update(patch).eq("id", rawUser.id);
          }
        }
      } catch (e) {
        // Non-fatal background sync
      }
    })();

    res.json(mapped);
  });

  app.post("/api/chacara/users", async (req, res) => {
    const user = (req as any).user;
    const { 
      name, phone, has_energy, has_water, energy_meters_count, water_meters_count, energy_active, water_active,
      street, house_number, cpf, rua, casa, energy_meter_statuses, water_meter_statuses 
    } = req.body;

    const finalStreet = cleanAddressNumber(street || rua || "");
    const finalHouseNumber = cleanAddressNumber(house_number || casa || "");
    const finalCpf = cpf || "";

    const payloadWithCols: any = { 
      name, 
      phone: encodeChacaraUserPhone(phone, { street: finalStreet, house_number: finalHouseNumber, cpf: finalCpf, energy_meter_statuses, water_meter_statuses }), 
      street: finalStreet,
      house_number: finalHouseNumber,
      cpf: finalCpf,
      user_id: user.id,
      has_energy: has_energy !== undefined ? has_energy : true,
      has_water: has_water !== undefined ? has_water : true,
      energy_meters_count: energy_meters_count || 1,
      water_meters_count: water_meters_count || 1,
      energy_active: energy_active !== undefined ? energy_active : true,
      water_active: water_active !== undefined ? water_active : true
    };

    let { data, error } = await supabase.from("chacara_users").insert([payloadWithCols]).select().single();

    // Fallback if columns street/house_number/cpf do not exist in DB yet (error 42703)
    if (error && error.code === '42703') {
      const fallbackPayload = {
        name,
        phone: encodeChacaraUserPhone(phone, { street: finalStreet, house_number: finalHouseNumber, cpf: finalCpf, energy_meter_statuses, water_meter_statuses }),
        user_id: user.id,
        has_energy: has_energy !== undefined ? has_energy : true,
        has_water: has_water !== undefined ? has_water : true,
        energy_meters_count: energy_meters_count || 1,
        water_meters_count: water_meters_count || 1,
        energy_active: energy_active !== undefined ? energy_active : true,
        water_active: water_active !== undefined ? water_active : true
      };
      const retry = await supabase.from("chacara_users").insert([fallbackPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return res.status(500).json(error);
    res.json(decodeChacaraUser(data));
  });

  app.put("/api/chacara/users/:id", async (req, res) => {
    const user = (req as any).user;
    const { 
      name, phone, has_energy, has_water, energy_meters_count, water_meters_count, energy_active, water_active,
      street, house_number, cpf, rua, casa, energy_meter_statuses, water_meter_statuses 
    } = req.body;

    const finalStreet = cleanAddressNumber(street || rua || "");
    const finalHouseNumber = cleanAddressNumber(house_number || casa || "");
    const finalCpf = cpf || "";

    const updateWithCols: any = { 
      name, 
      phone: encodeChacaraUserPhone(phone, { street: finalStreet, house_number: finalHouseNumber, cpf: finalCpf, energy_meter_statuses, water_meter_statuses }),
      street: finalStreet,
      house_number: finalHouseNumber,
      cpf: finalCpf,
      has_energy,
      has_water,
      energy_meters_count: energy_meters_count || 1,
      water_meters_count: water_meters_count || 1,
      energy_active: energy_active !== undefined ? energy_active : true,
      water_active: water_active !== undefined ? water_active : true
    };

    let { data, error } = await supabase.from("chacara_users").update(updateWithCols).eq("id", req.params.id).eq("user_id", user.id).select().single();

    // Fallback if columns street/house_number/cpf do not exist in DB yet (error 42703)
    if (error && error.code === '42703') {
      const fallbackUpdate = {
        name,
        phone: encodeChacaraUserPhone(phone, { street: finalStreet, house_number: finalHouseNumber, cpf: finalCpf, energy_meter_statuses, water_meter_statuses }),
        has_energy,
        has_water,
        energy_meters_count: energy_meters_count || 1,
        water_meters_count: water_meters_count || 1,
        energy_active: energy_active !== undefined ? energy_active : true,
        water_active: water_active !== undefined ? water_active : true
      };
      const retry = await supabase.from("chacara_users").update(fallbackUpdate).eq("id", req.params.id).eq("user_id", user.id).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return res.status(500).json(error);
    res.json(decodeChacaraUser(data) || { success: true });
  });

  app.delete("/api/chacara/users/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("chacara_users").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.get("/api/chacara/bills", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_bills").select("*").eq("user_id", user.id).order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/chacara/bills", async (req, res) => {
    const user = (req as any).user;
    const { 
      chacara_user_id, month_reference, reading_date, due_date, 
      prev_reading, curr_reading, prev_reading_2, curr_reading_2, kwh_value, 
      water_prev_reading, water_curr_reading, water_prev_reading_2, water_curr_reading_2, water_value, water_service_fee,
      apportionment_value, include_apportionment,
      reserve_fund, total, include_reserve_fund, status, payment_date, amount_paid,
      energy_readings, water_readings, paid_categories, is_divergent, observations
    } = req.body;
    
    // 1. Create Bill
    const { data: bill, error: billError } = await supabase.from("chacara_bills").insert([{
      chacara_user_id,
      month_reference,
      reading_date,
      due_date,
      prev_reading,
      curr_reading,
      prev_reading_2: prev_reading_2 || 0,
      curr_reading_2: curr_reading_2 || 0,
      kwh_value,
      water_prev_reading,
      water_curr_reading,
      water_prev_reading_2: water_prev_reading_2 || 0,
      water_curr_reading_2: water_curr_reading_2 || 0,
      water_value,
      water_service_fee: water_service_fee || 0,
      apportionment_value,
      include_apportionment,
      reserve_fund,
      total,
      include_reserve_fund,
      status: status || 'pending',
      payment_date: payment_date || null,
      amount_paid: amount_paid || 0,
      user_id: user.id,
      energy_readings: energy_readings || [],
      water_readings: water_readings || [],
      paid_categories: paid_categories || {},
      is_divergent: !!is_divergent,
      observations: observations || ''
    }]).select().single();

    if (billError) return res.status(500).json(billError);

    // 2. Update User's last readings
    await supabase.from("chacara_users").update({ 
      last_reading: curr_reading,
      last_reading_2: curr_reading_2 || 0,
      last_water_reading: water_curr_reading,
      last_water_reading_2: water_curr_reading_2 || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || []
    }).eq("id", chacara_user_id).eq("user_id", user.id);

    res.json(bill);
  });

  app.put("/api/chacara/bills/:id", async (req, res) => {
    const user = (req as any).user;
    const { 
      chacara_user_id, month_reference, reading_date, due_date, 
      prev_reading, curr_reading, prev_reading_2, curr_reading_2, kwh_value, 
      water_prev_reading, water_curr_reading, water_prev_reading_2, water_curr_reading_2, water_value, water_service_fee,
      apportionment_value, include_apportionment,
      reserve_fund, total, include_reserve_fund, status, payment_date, amount_paid,
      energy_readings, water_readings, paid_categories, is_divergent, observations
    } = req.body;
    
    const { data: bill, error } = await supabase.from("chacara_bills").update({
      chacara_user_id,
      month_reference,
      reading_date,
      due_date,
      prev_reading,
      curr_reading,
      prev_reading_2: prev_reading_2 || 0,
      curr_reading_2: curr_reading_2 || 0,
      kwh_value,
      water_prev_reading,
      water_curr_reading,
      water_prev_reading_2: water_prev_reading_2 || 0,
      water_curr_reading_2: water_curr_reading_2 || 0,
      water_value,
      water_service_fee: water_service_fee || 0,
      apportionment_value,
      include_apportionment,
      reserve_fund,
      total,
      include_reserve_fund,
      status,
      payment_date: payment_date || null,
      amount_paid: amount_paid || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || [],
      paid_categories: paid_categories || {},
      is_divergent: !!is_divergent,
      observations: observations || ''
    }).eq("id", req.params.id).eq("user_id", user.id).select().single();

    if (error) return res.status(500).json(error);
    
    // Update User's last readings
    await supabase.from("chacara_users").update({ 
      last_reading: curr_reading,
      last_reading_2: curr_reading_2 || 0,
      last_water_reading: water_curr_reading,
      last_water_reading_2: water_curr_reading_2 || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || []
    }).eq("id", chacara_user_id).eq("user_id", user.id);

    res.json(bill);
  });

  app.delete("/api/chacara/bills/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("chacara_bills").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.get("/api/chacara/settings", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_settings").select("*").eq("user_id", user.id).limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_settings' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(error);
    }
    
    res.json(data?.[0] || null);
  });

  app.put("/api/chacara/settings", async (req, res) => {
    const user = (req as any).user;
    const { 
      default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
      default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
      whatsapp_observation
    } = req.body;
    
    const { data: existings, error: checkError } = await supabase.from("chacara_settings").select("id").eq("user_id", user.id).limit(1);
    
    if (checkError) {
      if (checkError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_settings' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(checkError);
    }
    
    const existing = existings?.[0];
    
    let error;
    if (existing) {
      const res = await supabase.from("chacara_settings").update({
        default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
        default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
        whatsapp_observation
      }).eq("user_id", user.id);
      error = res.error;
    } else {
      const res = await supabase.from("chacara_settings").insert([{
        user_id: user.id, default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
        default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
        whatsapp_observation
      }]);
      error = res.error;
    }

    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // --- Accountability Endpoints ---
  app.get("/api/chacara/accountability/:month", async (req, res) => {
    const user = (req as any).user;
    const { month } = req.params; // YYYY-MM
    
    // 1. Get manually saved accountability data
    const { data: accs, error: accError } = await supabase
      .from("chacara_accountability")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_reference", month)
      .limit(1);
      
    if (accError) {
      if (accError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(accError);
    }
    
    const accountability = accs?.[0] || null;
    
    // 2. Calculate automatic collections from chacara_bills
    // Bills are paid in a specific month. We need to sum payments for this month.
    // The user wants: total, reserve_fund, energy, water, taxa_chacara
    
    const { data: bills, error: billsError } = await supabase
      .from("chacara_bills")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["paid", "partial", "Pago", "Parcial"])
      .eq("month_reference", month);

    if (billsError) {
      console.error("Error fetching bills for accountability:", billsError);
      return res.status(500).json(billsError);
    }

    let total_collected = 0;
    let collected_reserve_fund = 0;
    let collected_energy = 0;
    let collected_water = 0;
    let collected_taxa_chacara = 0;

    if (bills) {
      bills.forEach(bill => {
        const isPaid = bill.status === 'paid' || bill.status === 'Pago';
        const amountPaid = isPaid ? Number(bill.total || 0) : Number(bill.amount_paid || 0);
        const ratio = bill.total > 0 ? amountPaid / Number(bill.total) : 0;
        
        total_collected += amountPaid;

        const fundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
        const rateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
        const prestador = bill.water_service_fee || 0;

        const energyReadings = bill.energy_readings || [];
        const waterReadings = bill.water_readings || [];

        const energyConsumption = energyReadings.length > 0
          ? energyReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
          : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
        const energia = energyConsumption * bill.kwh_value;
        
        const waterConsumption = waterReadings.length > 0
          ? waterReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
          : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
        const agua = waterConsumption * (bill.water_value || 0);

        const hasPaidCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0;
        
        const getReceived = (value: number, key: string) => {
          if (hasPaidCategories) {
            return bill.paid_categories[key] ? value : 0;
          }
          return value * ratio;
        };

        collected_reserve_fund += getReceived(fundoReserva, 'reserve_fund');
        collected_energy += getReceived(energia, 'energy_total');
        collected_water += getReceived(agua, 'water_total');
        collected_taxa_chacara += getReceived(prestador, 'water_service_fee') + getReceived(rateio, 'apportionment');
      });
    }
    
    res.json({
      ...(accountability || { month_reference: month, user_id: user.id }),
      total_collected,
      collected_reserve_fund,
      collected_energy,
      collected_water,
      collected_taxa_chacara
    });
  });

  app.post("/api/chacara/accountability", async (req, res) => {
    const user = (req as any).user;
    const { 
      month_reference, prev_balance_reserve_fund, prev_balance_main_account,
      prev_balance_services, prev_balance_energy, prev_balance_water,
      total_collected, closing_date
    } = req.body;
    
    // Check if exists
    const { data: existings, error: checkError } = await supabase
      .from("chacara_accountability")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_reference", month_reference)
      .limit(1);
      
    if (checkError) {
      if (checkError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(checkError);
    }
    
    const existing = existings?.[0];

    let result;
    if (existing) {
      result = await supabase.from("chacara_accountability").update({
        prev_balance_reserve_fund: prev_balance_reserve_fund || 0,
        prev_balance_main_account: prev_balance_main_account || 0,
        prev_balance_services: prev_balance_services || 0,
        prev_balance_energy: prev_balance_energy || 0,
        prev_balance_water: prev_balance_water || 0,
        total_collected: total_collected || 0,
        closing_date: closing_date || null
      }).eq("id", existing.id).select().single();
    } else {
      result = await supabase.from("chacara_accountability").insert([{
        user_id: user.id,
        month_reference,
        prev_balance_reserve_fund: prev_balance_reserve_fund || 0,
        prev_balance_main_account: prev_balance_main_account || 0,
        prev_balance_services: prev_balance_services || 0,
        prev_balance_energy: prev_balance_energy || 0,
        prev_balance_water: prev_balance_water || 0,
        total_collected: total_collected || 0,
        closing_date: closing_date || null
      }]).select().single();
    }
    
    if (result.error) return res.status(500).json(result.error);
    res.json(result.data);
  });

  app.get("/api/chacara/expenses", async (req, res) => {
    const user = (req as any).user;
    
    const { data: accs, error: accsError } = await supabase.from("chacara_accountability").select("id, month_reference").eq("user_id", user.id);
    
    if (accsError) {
      if (accsError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(accsError);
    }
    
    if (!accs || accs.length === 0) return res.json([]);
    
    const accIds = accs.map(a => a.id);
    const { data: expenses, error } = await supabase.from("chacara_expenses").select("*").in("accountability_id", accIds).order('date', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_expenses' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(error);
    }
    
    const mapped = expenses?.map(e => {
      const acc = accs.find(a => a.id === e.accountability_id);
      return { ...e, month_reference: acc?.month_reference };
    }) || [];
    
    res.json(mapped);
  });

  app.post("/api/chacara/expenses", async (req, res) => {
    const user = (req as any).user;
    const { month_reference, description, category, amount, date, receipt_url } = req.body;
    
    if (!month_reference || !description || amount === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    try {
      let { data: accs, error: accError } = await supabase
        .from("chacara_accountability")
        .select("id")
        .eq("user_id", user.id)
        .eq("month_reference", month_reference)
        .limit(1);
      
      let acc = accs?.[0];

      if (accError) {
        console.error("Error fetching accountability:", accError);
        if (accError.code === '42P01') {
          return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
        }
        return res.status(500).json({ error: accError.message || JSON.stringify(accError) });
      }
      
      if (!acc) {
        const { data: newAcc, error: createError } = await supabase
          .from("chacara_accountability")
          .insert([{ user_id: user.id, month_reference }])
          .select("id")
          .single();
          
        if (createError) {
          console.error("Error creating accountability:", createError);
          return res.status(500).json(createError);
        }
        acc = newAcc;
      }
      
      const { data, error } = await supabase.from("chacara_expenses").insert([{
        accountability_id: acc.id,
        description,
        category,
        amount: Number(amount),
        date,
        receipt_url
      }]).select().single();
      
      if (error) {
        console.error("Error inserting expense:", JSON.stringify(error, null, 2));
        if (error.code === '42P01') {
          return res.status(500).json({ error: "A tabela 'chacara_expenses' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
        }
        return res.status(500).json(error);
      }
      
      res.json({ ...data, month_reference });
    } catch (err: any) {
      console.error("Unexpected error saving expense:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor" });
    }
  });

  app.delete("/api/chacara/expenses/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    const { data: expense } = await supabase.from("chacara_expenses").select("accountability_id").eq("id", id).single();
    if (expense) {
       const { data: acc } = await supabase.from("chacara_accountability").select("user_id").eq("id", expense.accountability_id).single();
       if (acc && acc.user_id === user.id) {
          const { error } = await supabase.from("chacara_expenses").delete().eq("id", id);
          if (error) return res.status(500).json(error);
          return res.json({ success: true });
       }
    }
    res.status(403).json({ error: "Unauthorized" });
  });

  app.put("/api/chacara/expenses/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { month_reference, description, category, amount, date, receipt_url } = req.body;
    
    try {
      const { data: expense } = await supabase.from("chacara_expenses").select("accountability_id").eq("id", id).single();
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      
      const { data: acc } = await supabase.from("chacara_accountability").select("user_id").eq("id", expense.accountability_id).single();
      if (!acc || acc.user_id !== user.id) return res.status(403).json({ error: "Unauthorized" });

      // If month_reference changed, we need to update accountability_id
      let newAccId = expense.accountability_id;
      const { data: currentAcc } = await supabase.from("chacara_accountability").select("month_reference").eq("id", expense.accountability_id).single();
      
      if (currentAcc && currentAcc.month_reference !== month_reference) {
        let { data: newAcc } = await supabase.from("chacara_accountability").select("id").eq("user_id", user.id).eq("month_reference", month_reference).single();
        if (!newAcc) {
          const { data: createdAcc, error: createError } = await supabase.from("chacara_accountability").insert([{ user_id: user.id, month_reference }]).select().single();
          if (createError) return res.status(500).json(createError);
          newAcc = createdAcc;
        }
        newAccId = newAcc.id;
      }

      const { data, error } = await supabase.from("chacara_expenses").update({
        accountability_id: newAccId,
        description,
        category,
        amount: Number(amount),
        date,
        receipt_url
      }).eq("id", id).select().single();
      
      if (error) return res.status(500).json(error);
      res.json({ ...data, month_reference });
    } catch (err: any) {
      console.error("Unexpected error updating expense:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor" });
    }
  });

  // Helper functions for Safety Reports schema resilience
  const encodeSafetyLocationMeta = (location: string | undefined | null, meta: { supervisor?: string; status?: string; completed_at?: string | null }) => {
    const cleanLoc = (location || "").replace(/^\[META:[^\]]+\]\n?/i, "");
    const jsonMeta = JSON.stringify({
      supervisor: meta.supervisor || "",
      status: meta.status || "pending",
      completed_at: meta.completed_at || null
    });
    return `[META:${jsonMeta}]\n${cleanLoc}`;
  };

  const decodeSafetyReport = (report: any) => {
    if (!report) return report;
    let supervisor = report.supervisor;
    let status = report.status;
    let completed_at = report.completed_at;
    let location = report.location || "";

    const match = location.match(/^\[META:([^\]]+)\]\n?/i);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (!supervisor && parsed.supervisor !== undefined) supervisor = parsed.supervisor;
        if (!status && parsed.status !== undefined) status = parsed.status;
        if (!completed_at && parsed.completed_at !== undefined) completed_at = parsed.completed_at;
        location = location.replace(/^\[META:[^\]]+\]\n?/i, "");
      } catch (e) {
        console.error("Error parsing safety location metadata:", e);
      }
    }

    return {
      ...report,
      location,
      supervisor: supervisor || "",
      status: status || "pending",
      completed_at: completed_at || null
    };
  };

  // Safety Reports
  app.get("/api/safety/reports", async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Attempt join first with non-conformities
      let { data, error } = await supabase
        .from("safety_reports")
        .select(`
          *,
          safety_non_conformities (id, due_date, classification, description, normative_items, suggestion)
        `)
        .eq("user_id", user.id)
        .neq("report_number", "__safety_default_logos__")
        .order("created_at", { ascending: false });
      
      if (error) {
        // Fallback without join if foreign key relation is not explicitly mapped
        const fallbackRes = await supabase
          .from("safety_reports")
          .select("*")
          .eq("user_id", user.id)
          .neq("report_number", "__safety_default_logos__")
          .order("created_at", { ascending: false });
        data = fallbackRes.data;
      }
      
      const mapped = (data || [])
        .filter((r: any) => r.report_number !== '__safety_default_logos__')
        .map((r: any) => {
        const decoded = decodeSafetyReport(r);
        const nonConformities = (r.safety_non_conformities || []).map((nc: any) => ({
          id: nc.id,
          description: nc.description || '',
          suggestion: nc.suggestion || '',
          normativeItems: nc.normative_items || '',
          classification: nc.classification || 'GRAVE',
          dueDate: nc.due_date || '',
          images: []
        }));
        return {
          ...decoded,
          nonConformities: nonConformities.length > 0 ? nonConformities : (decoded.nonConformities || [])
        };
      });
      res.json(mapped);
    } catch (err: any) {
      console.error("Unexpected error in GET /api/safety/reports:", err);
      res.status(500).json({ error: err.message || "Erro ao carregar relatórios de segurança" });
    }
  });

  app.get("/api/safety/reports/:id/non-conformities", async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      // Verify ownership
      const { data: report, error: rError } = await supabase
        .from("safety_reports")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (rError || !report) {
        return res.status(403).json({ error: "Unauthorized or not found" });
      }

      const { data, error } = await supabase
        .from("safety_non_conformities")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching non-conformities:", error.message);
        return res.status(500).json({ error: error.message });
      }
      
      const mapped = (data || []).map((nc: any) => ({
        ...nc,
        images: Array.isArray(nc.images) && nc.images.length > 0 
          ? nc.images 
          : (nc.image_data ? [nc.image_data] : [])
      }));

      res.json(mapped);
    } catch (err: any) {
      console.error("Unexpected error in GET non-conformities:", err);
      res.status(500).json({ error: err.message || "Erro ao carregar inconformidades" });
    }
  });

  app.post("/api/safety/reports", async (req, res) => {
    try {
      const user = (req as any).user;
      const { report_number, location, supervisor, status, completed_at, logo_1, logo_2, non_conformities } = req.body;

      let payload: any = { 
        user_id: user.id, 
        report_number: report_number || "", 
        location: location || "", 
        supervisor: supervisor || "",
        logo_1: logo_1 || null,
        logo_2: logo_2 || null,
        status: status || 'pending',
        completed_at: completed_at || null
      };

      let { data: report, error: rError } = await supabase
        .from("safety_reports")
        .insert([payload])
        .select()
        .single();

      // If DB doesn't have supervisor, status, or completed_at columns (PGRST204), fallback to encoded location
      if (rError && (rError.code === 'PGRST204' || rError.message?.includes('column'))) {
        console.warn("[Safety] Schema fallback: encoding metadata inside location string");
        payload = {
          user_id: user.id,
          report_number: report_number || "",
          location: encodeSafetyLocationMeta(location, { supervisor, status, completed_at }),
          logo_1: logo_1 || null,
          logo_2: logo_2 || null
        };
        const retryResult = await supabase
          .from("safety_reports")
          .insert([payload])
          .select()
          .single();
        report = retryResult.data;
        rError = retryResult.error;
      }

      if (rError || !report) {
        console.error("Error creating safety report:", rError?.message);
        return res.status(500).json({ error: rError?.message || "Erro ao salvar relatório no banco de dados" });
      }

      if (non_conformities && Array.isArray(non_conformities) && non_conformities.length > 0) {
        const ncs = non_conformities.map((nc: any) => ({
          report_id: report.id,
          description: nc.description || "",
          suggestion: nc.suggestion || "",
          normative_items: nc.normative_items || nc.normativeItems || "",
          classification: nc.classification || "GRAVE",
          due_date: nc.due_date || nc.dueDate || null,
          images: Array.isArray(nc.images) ? nc.images : (nc.image ? [nc.image] : [])
        }));

        let { error: nError } = await supabase
          .from("safety_non_conformities")
          .insert(ncs);

        // Fallback for image_data column if images array fails
        if (nError && (nError.code === 'PGRST204' || nError.message?.includes('images'))) {
          console.warn("[Safety NC] Schema fallback: inserting with image_data");
          const fallbackNcs = ncs.map(nc => ({
            report_id: report.id,
            description: nc.description,
            suggestion: nc.suggestion,
            normative_items: nc.normative_items,
            classification: nc.classification,
            due_date: nc.due_date,
            image_data: nc.images?.[0] || null
          }));
          await supabase.from("safety_non_conformities").insert(fallbackNcs);
        } else if (nError) {
          console.error("Error creating non-conformities:", nError.message);
        }
      }

      res.json(decodeSafetyReport(report));
    } catch (err: any) {
      console.error("Unexpected error in POST /api/safety/reports:", err);
      res.status(500).json({ error: err.message || "Erro interno ao cadastrar relatório" });
    }
  });

  app.put("/api/safety/reports/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { report_number, location, supervisor, status, completed_at, logo_1, logo_2, non_conformities } = req.body;

      let updatePayload: any = { 
        report_number: report_number || "", 
        location: location || "", 
        supervisor: supervisor || "", 
        status: status || 'pending', 
        completed_at: completed_at || null,
        logo_1: logo_1 || null,
        logo_2: logo_2 || null
      };

      let { data: report, error: rError } = await supabase
        .from("safety_reports")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      // If DB doesn't have supervisor, status, or completed_at columns (PGRST204), fallback to encoded location
      if (rError && (rError.code === 'PGRST204' || rError.message?.includes('column'))) {
        console.warn("[Safety PUT] Schema fallback: encoding metadata inside location string");
        updatePayload = {
          report_number: report_number || "",
          location: encodeSafetyLocationMeta(location, { supervisor, status, completed_at }),
          logo_1: logo_1 || null,
          logo_2: logo_2 || null
        };
        const retryResult = await supabase
          .from("safety_reports")
          .update(updatePayload)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        report = retryResult.data;
        rError = retryResult.error;
      }

      if (rError || !report) {
        console.error("Error updating safety report:", rError?.message);
        return res.status(500).json({ error: rError?.message || "Erro ao atualizar relatório no banco de dados" });
      }

      if (non_conformities !== undefined) {
        // Delete existing non-conformities and re-insert
        await supabase.from("safety_non_conformities").delete().eq("report_id", id);
        
        if (Array.isArray(non_conformities) && non_conformities.length > 0) {
          const ncs = non_conformities.map((nc: any) => ({
            report_id: id,
            description: nc.description || "",
            suggestion: nc.suggestion || "",
            normative_items: nc.normative_items || nc.normativeItems || "",
            classification: nc.classification || "GRAVE",
            due_date: nc.due_date || nc.dueDate || null,
            images: Array.isArray(nc.images) ? nc.images : (nc.image ? [nc.image] : [])
          }));

          let { error: nError } = await supabase
            .from("safety_non_conformities")
            .insert(ncs);

          if (nError && (nError.code === 'PGRST204' || nError.message?.includes('images'))) {
            const fallbackNcs = ncs.map(nc => ({
              report_id: id,
              description: nc.description,
              suggestion: nc.suggestion,
              normative_items: nc.normative_items,
              classification: nc.classification,
              due_date: nc.due_date,
              image_data: nc.images?.[0] || null
            }));
            await supabase.from("safety_non_conformities").insert(fallbackNcs);
          } else if (nError) {
            console.error("Error updating non-conformities:", nError.message);
          }
        }
      }

      res.json(decodeSafetyReport(report));
    } catch (err: any) {
      console.error("Unexpected error in PUT /api/safety/reports:", err);
      res.status(500).json({ error: err.message || "Erro interno ao atualizar relatório" });
    }
  });

  app.delete("/api/safety/reports/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      // Delete child non-conformities first
      await supabase
        .from("safety_non_conformities")
        .delete()
        .eq("report_id", id);

      const { error } = await supabase
        .from("safety_reports")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting safety report:", error.message);
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Unexpected error in DELETE /api/safety/reports:", err);
      res.status(500).json({ error: err.message || "Erro interno ao excluir relatório" });
    }
  });

  // Safety Settings (Logos padrão do banco de dados)
  app.get("/api/safety/settings", async (req, res) => {
    try {
      const user = (req as any).user;

      // 1. Tentar tabela safety_settings
      const { data: sData, error: sError } = await supabase
        .from("safety_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (!sError && sData && sData.length > 0) {
        return res.json({
          logo_1: sData[0].logo_1 || null,
          logo_2: sData[0].logo_2 || null,
          updated_at: sData[0].updated_at || sData[0].created_at
        });
      }

      // 2. Fallback transparente para safety_reports com report_number = '__safety_default_logos__'
      const { data: rData, error: rError } = await supabase
        .from("safety_reports")
        .select("logo_1, logo_2, created_at")
        .eq("user_id", user.id)
        .eq("report_number", "__safety_default_logos__")
        .limit(1);

      if (!rError && rData && rData.length > 0) {
        return res.json({
          logo_1: rData[0].logo_1 || null,
          logo_2: rData[0].logo_2 || null,
          updated_at: rData[0].created_at
        });
      }

      // Nenhuma logo salva ainda
      res.json({ logo_1: null, logo_2: null });
    } catch (err: any) {
      console.error("Unexpected error in GET /api/safety/settings:", err);
      res.status(500).json({ error: err.message || "Erro ao carregar configurações de segurança" });
    }
  });

  app.put("/api/safety/settings", async (req, res) => {
    try {
      const user = (req as any).user;
      const { logo_1, logo_2 } = req.body;

      // 1. Tentar salvar na tabela safety_settings se ela existir
      const { data: existingSettings, error: checkError } = await supabase
        .from("safety_settings")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!checkError) {
        if (existingSettings && existingSettings.length > 0) {
          const { error: updErr } = await supabase
            .from("safety_settings")
            .update({
              logo_1: logo_1 || null,
              logo_2: logo_2 || null,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);
          if (!updErr) {
            return res.json({ success: true, savedIn: "safety_settings" });
          }
        } else {
          const { error: insErr } = await supabase
            .from("safety_settings")
            .insert([{
              user_id: user.id,
              logo_1: logo_1 || null,
              logo_2: logo_2 || null
            }]);
          if (!insErr) {
            return res.json({ success: true, savedIn: "safety_settings" });
          }
        }
      }

      // 2. Fallback direto para tabela safety_reports (garantida de existir)
      const { data: existingReport } = await supabase
        .from("safety_reports")
        .select("id")
        .eq("user_id", user.id)
        .eq("report_number", "__safety_default_logos__")
        .limit(1);

      if (existingReport && existingReport.length > 0) {
        const { error: updErr } = await supabase
          .from("safety_reports")
          .update({
            logo_1: logo_1 || null,
            logo_2: logo_2 || null,
            location: "__safety_settings__"
          })
          .eq("id", existingReport[0].id);

        if (updErr) {
          console.error("Error updating safety_reports for settings:", updErr);
          throw updErr;
        }
      } else {
        const { error: insErr } = await supabase
          .from("safety_reports")
          .insert([{
            user_id: user.id,
            report_number: "__safety_default_logos__",
            location: "__safety_settings__",
            logo_1: logo_1 || null,
            logo_2: logo_2 || null
          }]);

        if (insErr) {
          console.error("Error inserting safety_reports for settings:", insErr);
          throw insErr;
        }
      }

      res.json({ success: true, savedIn: "safety_reports" });
    } catch (err: any) {
      console.error("Unexpected error in PUT /api/safety/settings:", err);
      res.status(500).json({ error: err.message || "Erro ao salvar configurações no banco de dados" });
    }
  });

  // Personal Module Helpers & Routes (Non-destructive metadata + table fallback)
  const SYS_PREFIX = '__OAI_SYS__:';

  const encodePersonalTaskDescription = (
    description: string | undefined | null,
    meta: {
      due_time?: string;
      category?: string;
      tags?: string[];
      item_type?: 'task' | 'note';
      completed_at?: string | null;
    }
  ) => {
    const cleanDesc = (description || '').replace(/^\[PTMETA:[^\]]+\]\n?/is, '');
    const cleanMeta: any = {};
    if (meta.due_time) cleanMeta.due_time = meta.due_time;
    if (meta.category) cleanMeta.category = meta.category;
    if (Array.isArray(meta.tags) && meta.tags.length > 0) cleanMeta.tags = meta.tags;
    if (meta.item_type && meta.item_type !== 'task') cleanMeta.item_type = meta.item_type;
    if (meta.completed_at) cleanMeta.completed_at = meta.completed_at;
    if (Object.keys(cleanMeta).length === 0) return cleanDesc;
    return `[PTMETA:${JSON.stringify(cleanMeta)}]\n${cleanDesc}`;
  };

  const decodePersonalTask = (row: any) => {
    if (!row) return row;
    let description = row.description || '';
    let due_time = row.due_time || '';
    let category = row.category || '';
    let tags: string[] = Array.isArray(row.tags) ? row.tags : [];
    let item_type: 'task' | 'note' = row.item_type || 'task';
    let completed_at: string | null = row.completed_at || null;

    const match = description.match(/^\[PTMETA:([^\]]+)\]\n?(.*)$/s);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (meta.due_time !== undefined) due_time = meta.due_time;
        if (meta.category !== undefined) category = meta.category;
        if (Array.isArray(meta.tags)) tags = meta.tags;
        if (meta.item_type) item_type = meta.item_type;
        if (meta.completed_at !== undefined) completed_at = meta.completed_at;
        description = match[2] || '';
      } catch {
        // Keep original description if metadata parse fails
      }
    }

    return {
      ...row,
      description,
      due_time: due_time || undefined,
      category: category || undefined,
      tags,
      item_type,
      completed_at,
    };
  };

  const isMissingTableError = (err: any) => {
    if (!err) return false;
    return err.code === '42P01' || err.code === 'PGRST205' || String(err.message || '').includes('does not exist') || String(err.message || '').includes('schema cache');
  };

  // Personal Tasks
  app.get("/api/personal/tasks", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from("personal_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) return res.status(500).json(error);
    const tasks = (data || [])
      .filter((row: any) => !String(row.title || '').startsWith(SYS_PREFIX))
      .map(decodePersonalTask);
    res.json(tasks);
  });

  app.post("/api/personal/tasks", async (req, res) => {
    const user = (req as any).user;
    const {
      title, description, due_date, due_time, category, tags, item_type,
      completed_at, priority, status, eisenhower_quadrant
    } = req.body;
    const resolvedStatus = status || 'pending';
    const resolvedCompletedAt = resolvedStatus === 'completed' ? (completed_at || new Date().toISOString()) : null;
    const encodedDesc = encodePersonalTaskDescription(description, {
      due_time,
      category,
      tags,
      item_type: item_type || 'task',
      completed_at: resolvedCompletedAt,
    });

    const { data, error } = await supabase
      .from("personal_tasks")
      .insert([{
        user_id: user.id,
        title,
        description: encodedDesc,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: resolvedStatus,
        eisenhower_quadrant: eisenhower_quadrant || 'not_urgent_important'
      }])
      .select()
      .single();
    if (error) return res.status(500).json(error);
    res.json(decodePersonalTask(data));
  });

  app.put("/api/personal/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const {
      title, description, due_date, due_time, category, tags, item_type,
      completed_at, priority, status, eisenhower_quadrant
    } = req.body;
    const resolvedStatus = status || 'pending';
    const resolvedCompletedAt = resolvedStatus === 'completed' ? (completed_at || new Date().toISOString()) : null;
    const encodedDesc = encodePersonalTaskDescription(description, {
      due_time,
      category,
      tags,
      item_type: item_type || 'task',
      completed_at: resolvedCompletedAt,
    });

    const { data, error } = await supabase
      .from("personal_tasks")
      .update({
        title,
        description: encodedDesc,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: resolvedStatus,
        eisenhower_quadrant: eisenhower_quadrant || 'not_urgent_important'
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return res.status(500).json(error);
    res.json(decodePersonalTask(data));
  });

  app.delete("/api/personal/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { error } = await supabase
      .from("personal_tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  const isMissingColumnError = (err: any) => {
    if (!err) return false;
    const msg = String(err.message || '');
    return err.code === '42703' || err.code === 'PGRST204' || msg.includes('column') || msg.includes('schema cache');
  };

  const encodeHabitTargetWithMeta = (
    target: string | undefined | null,
    meta: {
      real_frequency?: string;
      times_per_day?: number;
      duration_days?: number | null;
      start_date?: string | null;
      month_days?: number[];
      specific_dates?: string[];
    }
  ) => {
    const cleanTarget = String(target || '').replace(/^\[HMETA:[^\]]+\]/is, '');
    return `[HMETA:${JSON.stringify(meta)}]${cleanTarget}`;
  };

  const decodeHabitRow = (row: any) => {
    if (!row) return row;
    let target = String(row.target || '');
    const metaMatch = target.match(/^\[HMETA:([^\]]+)\](.*)$/s);
    if (!metaMatch) {
      return {
        ...row,
        times_per_day: Math.max(1, Number(row.times_per_day || 1)),
        duration_days: row.duration_days ?? null,
        start_date: row.start_date ?? null,
        month_days: Array.isArray(row.month_days) ? row.month_days : [],
        specific_dates: Array.isArray(row.specific_dates) ? row.specific_dates : [],
      };
    }
    try {
      const meta = JSON.parse(metaMatch[1]);
      return {
        ...row,
        frequency: meta.real_frequency || row.frequency,
        times_per_day: Math.max(1, Number(meta.times_per_day || row.times_per_day || 1)),
        duration_days: meta.duration_days ?? row.duration_days ?? null,
        start_date: meta.start_date ?? row.start_date ?? null,
        month_days: Array.isArray(meta.month_days) ? meta.month_days : [],
        specific_dates: Array.isArray(meta.specific_dates) ? meta.specific_dates : [],
        target: metaMatch[2] || '',
      };
    } catch {
      return row;
    }
  };

  // Personal Habits
  app.get("/api/personal/habits", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase
        .from("personal_habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        return res.json(data.map(decodeHabitRow));
      }
      if (error && !isMissingTableError(error)) {
        return res.status(500).json(error);
      }

      const { data: sysRows, error: sysErr } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .like("title", `${SYS_PREFIX}HABIT:%`)
        .order("id", { ascending: true });

      if (sysErr) return res.status(500).json(sysErr);
      const habits = (sysRows || []).map((r: any) => {
        try {
          return decodeHabitRow(JSON.parse(r.description || '{}'));
        } catch {
          return null;
        }
      }).filter(Boolean);
      res.json(habits);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/personal/habits", async (req, res) => {
    try {
      const user = (req as any).user;
      const {
        name, frequency, days_of_week, month_days, specific_dates,
        times_per_day, duration_days, start_date, target, category, is_active
      } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Nome do hábito é obrigatório." });
      }
      const habitId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cleanTimesPerDay = Math.max(1, Math.min(99, Math.floor(Number(times_per_day || 1))));
      const cleanDuration = duration_days !== undefined && duration_days !== null && String(duration_days).trim() !== ''
        ? Math.max(1, Math.floor(Number(duration_days)))
        : null;
      const cleanStartDate = start_date ? String(start_date).split('T')[0] : null;
      const cleanMonthDays = Array.isArray(month_days) ? month_days.map(Number).filter((n) => n >= 1 && n <= 31) : [];
      const cleanSpecificDates = Array.isArray(specific_dates)
        ? specific_dates.map((d) => String(d).split('T')[0]).filter(Boolean)
        : [];

      const payload = {
        id: habitId,
        user_id: user.id,
        name: String(name).trim(),
        frequency: frequency || 'daily',
        days_of_week: Array.isArray(days_of_week) ? days_of_week : [0, 1, 2, 3, 4, 5, 6],
        month_days: cleanMonthDays,
        specific_dates: cleanSpecificDates,
        times_per_day: cleanTimesPerDay,
        duration_days: cleanDuration,
        start_date: cleanStartDate,
        target: target || '',
        category: category || '',
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("personal_habits")
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return res.json(decodeHabitRow(data));
      }
      if (error && isMissingColumnError(error)) {
        const legacyFreq = ['daily', 'weekdays', 'custom'].includes(payload.frequency) ? payload.frequency : 'custom';
        const legacyPayload = {
          id: payload.id,
          user_id: payload.user_id,
          name: payload.name,
          frequency: legacyFreq,
          days_of_week: payload.days_of_week,
          target: encodeHabitTargetWithMeta(payload.target, {
            real_frequency: payload.frequency,
            times_per_day: payload.times_per_day,
            duration_days: payload.duration_days,
            start_date: payload.start_date,
            month_days: payload.month_days,
            specific_dates: payload.specific_dates,
          }),
          category: payload.category,
          is_active: payload.is_active,
          created_at: payload.created_at,
        };
        const { data: legacyData, error: legacyErr } = await supabase
          .from("personal_habits")
          .insert([legacyPayload])
          .select()
          .single();
        if (!legacyErr && legacyData) {
          return res.json(decodeHabitRow(legacyData));
        }
      }
      if (error && !isMissingTableError(error) && !isMissingColumnError(error)) {
        return res.status(500).json(error);
      }

      const { error: sysErr } = await supabase
        .from("personal_tasks")
        .insert([{
          user_id: user.id,
          title: `${SYS_PREFIX}HABIT:${habitId}`,
          description: JSON.stringify(payload),
          priority: 'medium',
          status: payload.is_active ? 'pending' : 'completed',
        }]);

      if (sysErr) return res.status(500).json(sysErr);
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/personal/habits/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const habitId = req.params.id;
      const {
        name, frequency, days_of_week, month_days, specific_dates,
        times_per_day, duration_days, start_date, target, category, is_active
      } = req.body;

      const cleanTimesPerDay = times_per_day !== undefined
        ? Math.max(1, Math.min(99, Math.floor(Number(times_per_day || 1))))
        : undefined;
      const cleanDuration = duration_days !== undefined
        ? (duration_days !== null && String(duration_days).trim() !== ''
            ? Math.max(1, Math.floor(Number(duration_days)))
            : null)
        : undefined;
      const cleanStartDate = start_date !== undefined
        ? (start_date ? String(start_date).split('T')[0] : null)
        : undefined;

      const updateFields: any = {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(frequency !== undefined ? { frequency } : {}),
        ...(days_of_week !== undefined ? { days_of_week } : {}),
        ...(month_days !== undefined ? { month_days } : {}),
        ...(specific_dates !== undefined ? { specific_dates } : {}),
        ...(cleanTimesPerDay !== undefined ? { times_per_day: cleanTimesPerDay } : {}),
        ...(cleanDuration !== undefined ? { duration_days: cleanDuration } : {}),
        ...(cleanStartDate !== undefined ? { start_date: cleanStartDate } : {}),
        ...(target !== undefined ? { target } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      };

      const { data, error } = await supabase
        .from("personal_habits")
        .update(updateFields)
        .eq("id", habitId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (!error && data) {
        return res.json(decodeHabitRow(data));
      }
      if (error && isMissingColumnError(error)) {
        const legacyFreq = frequency && ['daily', 'weekdays', 'custom'].includes(frequency) ? frequency : 'custom';
        const legacyUpdate: any = {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(frequency !== undefined ? { frequency: legacyFreq } : {}),
          ...(days_of_week !== undefined ? { days_of_week } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
          target: encodeHabitTargetWithMeta(target, {
            real_frequency: frequency,
            times_per_day: cleanTimesPerDay ?? 1,
            duration_days: cleanDuration ?? null,
            start_date: cleanStartDate ?? null,
            month_days: Array.isArray(month_days) ? month_days : [],
            specific_dates: Array.isArray(specific_dates) ? specific_dates : [],
          }),
        };
        const { data: legacyData, error: legacyErr } = await supabase
          .from("personal_habits")
          .update(legacyUpdate)
          .eq("id", habitId)
          .eq("user_id", user.id)
          .select()
          .single();
        if (!legacyErr && legacyData) {
          return res.json(decodeHabitRow(legacyData));
        }
      }
      if (error && !isMissingTableError(error) && !isMissingColumnError(error)) {
        return res.status(500).json(error);
      }

      const { data: existingRows, error: fetchErr } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("title", `${SYS_PREFIX}HABIT:${habitId}`)
        .limit(1);

      if (fetchErr) return res.status(500).json(fetchErr);
      const existing = existingRows?.[0];
      if (!existing) return res.status(404).json({ error: "Hábito não encontrado." });

      const currentObj = JSON.parse(existing.description || '{}');
      const updatedObj = {
        ...currentObj,
        ...updateFields,
      };

      const { error: updErr } = await supabase
        .from("personal_tasks")
        .update({
          description: JSON.stringify(updatedObj),
          status: updatedObj.is_active ? 'pending' : 'completed',
        })
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (updErr) return res.status(500).json(updErr);
      res.json(updatedObj);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/personal/habits/:id", async (req, res) => {
    try {
      const user = (req as any).user;
      const habitId = req.params.id;

      const { error } = await supabase
        .from("personal_habits")
        .delete()
        .eq("id", habitId)
        .eq("user_id", user.id);

      if (!error) {
        await supabase.from("personal_habit_logs").delete().eq("habit_id", habitId).eq("user_id", user.id);
        return res.json({ success: true });
      }
      if (!isMissingTableError(error)) {
        return res.status(500).json(error);
      }

      await supabase.from("personal_tasks").delete().eq("user_id", user.id).eq("title", `${SYS_PREFIX}HABIT:${habitId}`);
      await supabase.from("personal_tasks").delete().eq("user_id", user.id).like("title", `${SYS_PREFIX}HLOG:${habitId}:%`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Personal Habit Logs
  app.get("/api/personal/habit-logs", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase
        .from("personal_habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      if (error && !isMissingTableError(error)) {
        return res.status(500).json(error);
      }

      const { data: sysRows, error: sysErr } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .like("title", `${SYS_PREFIX}HLOG:%`);

      if (sysErr) return res.status(500).json(sysErr);
      const logs = (sysRows || []).map((r: any) => {
        try {
          return JSON.parse(r.description || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/personal/habit-logs", async (req, res) => {
    try {
      const user = (req as any).user;
      const { habit_id, date, completed, count } = req.body;
      if (!habit_id || !date) {
        return res.status(400).json({ error: "habit_id and date are required" });
      }
      const cleanDate = String(date).split('T')[0];
      const cleanCount = typeof count === 'number' && Number.isFinite(count)
        ? Math.max(0, Math.floor(count))
        : (completed ? 1 : 0);
      const payload = {
        habit_id: String(habit_id),
        user_id: user.id,
        date: cleanDate,
        completed: Boolean(completed),
        count: cleanCount,
        completed_at: completed ? new Date().toISOString() : null,
      };

      const { data: existingTbl, error: tblErr } = await supabase
        .from("personal_habit_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("habit_id", payload.habit_id)
        .eq("date", cleanDate)
        .limit(1);

      if (!tblErr) {
        if (existingTbl && existingTbl.length > 0) {
          const { data, error } = await supabase
            .from("personal_habit_logs")
            .update({ completed: payload.completed, count: payload.count, completed_at: payload.completed_at })
            .eq("id", existingTbl[0].id)
            .eq("user_id", user.id)
            .select()
            .single();
          if (!error && data) return res.json(data);
          if (error && isMissingColumnError(error)) {
            const { data: d2, error: e2 } = await supabase
              .from("personal_habit_logs")
              .update({ completed: payload.completed, completed_at: payload.completed_at })
              .eq("id", existingTbl[0].id)
              .eq("user_id", user.id)
              .select()
              .single();
            if (!e2 && d2) return res.json({ ...d2, count: payload.count });
          }
          if (error) return res.status(500).json(error);
        } else {
          const { data, error } = await supabase
            .from("personal_habit_logs")
            .insert([payload])
            .select()
            .single();
          if (!error && data) return res.json(data);
          if (error && isMissingColumnError(error)) {
            const { count: _omitCount, ...legacyLogPayload } = payload;
            const { data: d2, error: e2 } = await supabase
              .from("personal_habit_logs")
              .insert([legacyLogPayload])
              .select()
              .single();
            if (!e2 && d2) return res.json({ ...d2, count: payload.count });
          }
          if (error) return res.status(500).json(error);
        }
      }

      if (tblErr && !isMissingTableError(tblErr)) {
        return res.status(500).json(tblErr);
      }

      const logKey = `${SYS_PREFIX}HLOG:${payload.habit_id}:${cleanDate}`;
      const { data: sysRows } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("title", logKey)
        .limit(1);

      if (sysRows && sysRows.length > 0) {
        await supabase
          .from("personal_tasks")
          .update({
            description: JSON.stringify(payload),
            status: payload.completed ? 'completed' : 'pending',
          })
          .eq("id", sysRows[0].id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("personal_tasks")
          .insert([{
            user_id: user.id,
            title: logKey,
            description: JSON.stringify(payload),
            due_date: cleanDate,
            priority: 'low',
            status: payload.completed ? 'completed' : 'pending',
          }]);
      }

      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Personal Daily Check-ins ("Como foi hoje?" — strictly optional)
  app.get("/api/personal/checkins", async (req, res) => {
    try {
      const user = (req as any).user;
      const { data, error } = await supabase
        .from("personal_daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      if (error && !isMissingTableError(error)) {
        return res.status(500).json(error);
      }

      const { data: sysRows, error: sysErr } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .like("title", `${SYS_PREFIX}CHECKIN:%`)
        .order("due_date", { ascending: false });

      if (sysErr) return res.status(500).json(sysErr);
      const checkins = (sysRows || []).map((r: any) => {
        try {
          return JSON.parse(r.description || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean);
      res.json(checkins);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/personal/checkins", async (req, res) => {
    try {
      const user = (req as any).user;
      const { date, mood, energy, note } = req.body;
      if (!date || !mood) {
        return res.status(400).json({ error: "date and mood are required" });
      }
      const cleanDate = String(date).split('T')[0];
      const nowIso = new Date().toISOString();
      const payload = {
        id: cleanDate,
        user_id: user.id,
        date: cleanDate,
        mood,
        energy: Number(energy || 3),
        note: note ? String(note).trim() : '',
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { data: existingTbl, error: tblErr } = await supabase
        .from("personal_daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", cleanDate)
        .limit(1);

      if (!tblErr) {
        if (existingTbl && existingTbl.length > 0) {
          const { data, error } = await supabase
            .from("personal_daily_checkins")
            .update({ mood: payload.mood, energy: payload.energy, note: payload.note, updated_at: nowIso })
            .eq("id", existingTbl[0].id)
            .eq("user_id", user.id)
            .select()
            .single();
          if (error) return res.status(500).json(error);
          return res.json(data);
        } else {
          const { data, error } = await supabase
            .from("personal_daily_checkins")
            .insert([{
              user_id: user.id,
              date: cleanDate,
              mood: payload.mood,
              energy: payload.energy,
              note: payload.note,
            }])
            .select()
            .single();
          if (error) return res.status(500).json(error);
          return res.json(data);
        }
      }

      if (!isMissingTableError(tblErr)) {
        return res.status(500).json(tblErr);
      }

      const key = `${SYS_PREFIX}CHECKIN:${cleanDate}`;
      const { data: sysRows } = await supabase
        .from("personal_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("title", key)
        .limit(1);

      if (sysRows && sysRows.length > 0) {
        const existingObj = JSON.parse(sysRows[0].description || '{}');
        const merged = { ...existingObj, ...payload, created_at: existingObj.created_at || nowIso };
        const { error: updErr } = await supabase
          .from("personal_tasks")
          .update({ description: JSON.stringify(merged) })
          .eq("id", sysRows[0].id)
          .eq("user_id", user.id);
        if (updErr) return res.status(500).json(updErr);
        return res.json(merged);
      } else {
        const { error: insErr } = await supabase
          .from("personal_tasks")
          .insert([{
            user_id: user.id,
            title: key,
            description: JSON.stringify(payload),
            due_date: cleanDate,
            priority: 'low',
            status: 'completed',
          }]);
        if (insErr) return res.status(500).json(insErr);
        return res.json(payload);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/personal/checkins/:date", async (req, res) => {
    try {
      const user = (req as any).user;
      const cleanDate = String(req.params.date).split('T')[0];

      const { error } = await supabase
        .from("personal_daily_checkins")
        .delete()
        .eq("user_id", user.id)
        .eq("date", cleanDate);

      if (!error) {
        return res.json({ success: true });
      }
      if (!isMissingTableError(error)) {
        return res.status(500).json(error);
      }

      await supabase
        .from("personal_tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("title", `${SYS_PREFIX}CHECKIN:${cleanDate}`);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/work/escalas", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escalas').select('*');
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/work/escalas", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escalas').insert(req.body).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/work/escala_emails/:escalaId", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escala_emails').select('*').eq('escala_id', req.params.escalaId);
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/work/escala_emails", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escala_emails').insert(req.body).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/work/escala_emails/:id", async (req, res) => {
    try {
      const { error } = await supabase.from('escala_emails').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/work/escalas/:id", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escalas').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/work/escalas/:id", async (req, res) => {
    try {
      const { error } = await supabase.from('escalas').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/work/escala_emails/:id", async (req, res) => {
    try {
      const { data, error } = await supabase.from('escala_emails').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/work/email_templates", async (req, res) => {
    try {
      const { data, error } = await supabase.from('email_templates').select('*');
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/work/email_templates", async (req, res) => {
    try {
      const { data, error } = await supabase.from('email_templates').insert(req.body).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/work/email_templates/:id", async (req, res) => {
    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/work/email_templates/:id", async (req, res) => {
    try {
      const { data, error } = await supabase.from('email_templates').update(req.body).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/work/email_templates/:id/sync", async (req, res) => {
    try {
      const { id } = req.params;
      const { data: template, error: tError } = await supabase.from('email_templates').select('*').eq('id', id).single();
      if (tError) throw tError;
      
      const { data, error: uError } = await supabase
        .from('escalas')
        .update({
          email_subject_template: template.subject_template || '',
          email_body_template: template.body_template || ''
        })
        .eq('template_id', id)
        .select();
        
      if (uError) throw uError;
      res.json({ success: true, updated_count: data ? data.length : 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  async function setupVite() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      const viteModule = "vite";
      const { createServer: createViteServer } = await import(viteModule);
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === 'true' ? false : undefined
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      app.use(express.static(path.join(currentDir, "dist")));
      app.get("*", (req, res) => {
        res.sendFile(path.join(currentDir, "dist", "index.html"));
      });
    }

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error("Global Express Error:", err);
      res.status(500).json({ error: "Internal Server Error", message: err.message, stack: err.stack });
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", async () => {
        console.log(`Server running on http://localhost:${PORT}`);
        
        // Test Supabase connection and tables
        const tables = ["periods", "subjects", "presencas", "notas_atividades", "conteudos_web", "safety_reports", "safety_non_conformities", "escalas", "email_templates", "clients", "client_sales", "client_installments", "marketing_clients", "marketing_payments", "marketing_posts"];
        console.log("\n🔍 Verificando tabelas no Supabase...");
        
        for (const table of tables) {
          const { error } = await supabase.from(table).select("id").limit(1);
          if (error) {
            console.error(`❌ Erro na tabela [${table}]:`, error.message);
          } else {
            console.log(`✅ Tabela [${table}] detectada com sucesso.`);
          }
        }
        
        console.log("\n💡 DICA: Se alguma tabela acima falhou, execute o script SQL no painel do Supabase.\n");
      });
    }
  }

  if (!process.env.VERCEL) {
    setupVite();
  }

  export default app;
