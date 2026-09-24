/* Minimal, dedicated notification worker. No fetch interception or caching. */
self.addEventListener('notificationclick',event=>{
    event.notification.close();
    const raw=event.notification?.data?.url;
    const target=typeof raw==='string'?raw:self.registration.scope;
    event.waitUntil((async()=>{
        const destination=new URL(target,self.registration.scope);
        if(destination.origin!==self.location.origin)return;
        const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
        const existing=windows.find(client=>{
            try{return new URL(client.url).origin===destination.origin;}catch(_){return false;}
        });
        if(existing){
            if(typeof existing.navigate==='function'&&existing.url!==destination.href){
                try{await existing.navigate(destination.href);}catch(_){}
            }
            return existing.focus();
        }
        return clients.openWindow(destination.href);
    })());
});
