const fs = require('fs');
fetch('http://localhost:8000/api/patterns?days=7').then(r => r.json()).then(data => {
    const historyLogs = data.history || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - (7 * 86400000));
    const filteredLogs = historyLogs.filter(log => new Date(log.created_at.replace(' ', 'T') + "Z") >= cutoff);
    console.log("History length:", historyLogs.length);
    console.log("Filtered length:", filteredLogs.length);
    if(filteredLogs.length > 0) {
        console.log("First log:", filteredLogs[0]);
    }
}).catch(console.error);
