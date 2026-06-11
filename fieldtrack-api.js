// ============================================
// CLOUDFLARE WORKER - FULL API
// Deploy this to Workers & Pages
// ============================================

// Supabase configuration (set these as Environment Variables in Cloudflare)
// SUPABASE_URL = your-project.supabase.co
// SUPABASE_ANON_KEY = your-anon-key

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // CORS headers - allow your frontend to call this API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    
    // Helper: Make request to Supabase REST API
    async function supabaseFetch(endpoint, options = {}) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase error: ${response.status} - ${error}`);
      }
      
      return response;
    }
    
    // ============ TASKS ENDPOINTS ============
    
    // GET /api/tasks - Get all tasks (or filtered)
    if (path === '/api/tasks' && method === 'GET') {
      try {
        let query = 'tasks?select=*,employees(name,emp_id,role)';
        
        // Apply filters from query params
        if (url.searchParams.get('status')) {
          query += `&status=eq.${url.searchParams.get('status')}`;
        }
        if (url.searchParams.get('employee_id')) {
          query += `&employee_id=eq.${url.searchParams.get('employee_id')}`;
        }
        
        query += '&order=assigned_date.desc';
        
        const response = await supabaseFetch(query);
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // POST /api/tasks - Create new task
    if (path === '/api/tasks' && method === 'POST') {
      try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.job_title) {
          return new Response(JSON.stringify({ error: 'Job title required' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        const response = await supabaseFetch('tasks', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // PUT /api/tasks/:id/status - Update task status
    if (path.match(/^\/api\/tasks\/[^\/]+\/status$/) && method === 'PUT') {
      try {
        const taskId = path.split('/')[3];
        const { status } = await request.json();
        
        const completedDate = status === 'complete' ? new Date().toISOString() : null;
        
        const response = await supabaseFetch(`tasks?id=eq.${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ 
            status, 
            completed_date: completedDate,
            updated_at: new Date().toISOString()
          }),
        });
        
        return new Response(JSON.stringify({ success: true, status: status }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // DELETE /api/tasks/:id - Delete task
    if (path.match(/^\/api\/tasks\/[^\/]+$/) && method === 'DELETE') {
      try {
        const taskId = path.split('/')[3];
        await supabaseFetch(`tasks?id=eq.${taskId}`, { method: 'DELETE' });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // ============ EMPLOYEES ENDPOINTS ============
    
    // GET /api/employees
    if (path === '/api/employees' && method === 'GET') {
      try {
        const response = await supabaseFetch('employees?order=name.asc');
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // POST /api/employees
    if (path === '/api/employees' && method === 'POST') {
      try {
        const body = await request.json();
        
        if (!body.name || !body.emp_id) {
          return new Response(JSON.stringify({ error: 'Name and Employee ID required' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        const response = await supabaseFetch('employees', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // DELETE /api/employees/:id
    if (path.match(/^\/api\/employees\/[^\/]+$/) && method === 'DELETE') {
      try {
        const employeeId = path.split('/')[3];
        await supabaseFetch(`employees?id=eq.${employeeId}`, { method: 'DELETE' });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // ============ GROUPS ENDPOINTS ============
    
    // GET /api/groups
    if (path === '/api/groups' && method === 'GET') {
      try {
        const response = await supabaseFetch('groups?order=name.asc');
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // POST /api/groups
    if (path === '/api/groups' && method === 'POST') {
      try {
        const body = await request.json();
        
        if (!body.name) {
          return new Response(JSON.stringify({ error: 'Group name required' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        const response = await supabaseFetch('groups', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // PUT /api/groups/:id - Update group (for drag-drop members)
    if (path.match(/^\/api\/groups\/[^\/]+$/) && method === 'PUT') {
      try {
        const groupId = path.split('/')[3];
        const body = await request.json();
        
        const response = await supabaseFetch(`groups?id=eq.${groupId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // DELETE /api/groups/:id
    if (path.match(/^\/api\/groups\/[^\/]+$/) && method === 'DELETE') {
      try {
        const groupId = path.split('/')[3];
        await supabaseFetch(`groups?id=eq.${groupId}`, { method: 'DELETE' });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // ============ STATS ENDPOINT ============
    
    // GET /api/stats
    if (path === '/api/stats' && method === 'GET') {
      try {
        const [tasksRes, completedRes, employeesRes] = await Promise.all([
          supabaseFetch('tasks?select=id&status=neq.complete'),
          supabaseFetch('tasks?select=id&status=eq.complete'),
          supabaseFetch('employees?select=id'),
        ]);
        
        const tasks = await tasksRes.json();
        const completed = await completedRes.json();
        const employees = await employeesRes.json();
        
        const stats = {
          total_tasks: tasks.length,
          completed_tasks: completed.length,
          active_employees: employees.length,
          pending_tasks: tasks.filter(t => t.status === 'pending').length,
          in_progress_tasks: tasks.filter(t => t.status === 'progress').length,
          completion_rate: tasks.length > 0 ? ((completed.length / tasks.length) * 100).toFixed(1) : 0
        };
        
        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    
    // 404 for any other route
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: corsHeaders
    });
  }
};