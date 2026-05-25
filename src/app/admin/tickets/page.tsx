"use client"

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Clock, User, Mail, Search, CheckCircle2, Trash2, Eye, Calendar, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection, doc, deleteDoc, updateDoc, query, orderBy, arrayUnion, Timestamp, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminTicketsPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Real-time subscription to support tickets
  const ticketsQuery = useMemoFirebase(() => {
    return query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: tickets, isLoading } = useCollection(ticketsQuery);

  // Always derive active ticket from the real-time stream using the ID to ensure fresh data
  const activeTicket = useMemo(() => {
    if (!tickets || !selectedId) return null;
    return tickets.find(t => String(t.id) === String(selectedId));
  }, [tickets, selectedId]);

  const handleResolve = async (id: string) => {
    if (!id || !user) return;
    const resolveToast = toast.loading("Updating status...");
    try {
      await updateDoc(doc(db, 'supportTickets', id), { 
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid
      });
      toast.success("Ticket marked as resolved", { id: resolveToast });
    } catch (err) {
      console.error("Resolve error:", err);
      toast.error("Failed to update status", { id: resolveToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || !confirm("Are you sure you want to delete this inquiry?")) return;
    
    setIsDeletingId(id);
    const deleteToast = toast.loading("Removing inquiry...");
    
    try {
      await deleteDoc(doc(db, 'supportTickets', id));
      toast.success("Inquiry removed", { id: deleteToast });
      
      // If we are currently viewing the ticket we just deleted, close the console
      if (selectedId === id) {
        setIsDetailsOpen(false);
        setSelectedId(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete", { id: deleteToast });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket?.id) return;
  
    const replyToast = toast.loading("Sending reply...");
  
    try {
      const ticketRef = doc(db, 'supportTickets', activeTicket.id);
  
      const newReply = {
        sender: "admin",
        text: replyText.trim(),
        createdAt: Timestamp.now()
      };
  
      await updateDoc(ticketRef, {
        replies: arrayUnion(newReply)
      });
  
      setReplyText("");
      toast.success("Reply sent successfully", { id: replyToast });
  
    } catch (err) {
      console.error("Reply error:", err);
      toast.error("Failed to send reply", { id: replyToast });
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/admin/dashboard');
            }
          }}
          className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary hover:bg-primary/5 p-0 h-auto mb-6 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <h1 className="text-4xl font-headline font-black mb-2 flex items-center gap-3 text-foreground">
          <MessageSquare className="w-10 h-10 text-primary" />
          Support Intelligence
        </h1>
        <p className="text-muted-foreground font-medium">Manage incoming customer queries and standardize communication.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border shadow-sm rounded-[2rem] bg-white p-8">
          <div className="flex justify-between items-start mb-4">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <Badge className="bg-green-100 text-green-700 border-none rounded-full px-3 py-1 font-bold">LIVE</Badge>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Inquiries</p>
          <h3 className="text-4xl font-black mt-2 tracking-tight">{tickets?.length || 0}</h3>
        </Card>
        
        <Card className="border shadow-sm rounded-[2rem] bg-white p-8">
          <div className="flex justify-between items-start mb-4">
            <div className="p-4 rounded-2xl bg-orange-100 text-orange-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pending Response</p>
          <h3 className="text-4xl font-black mt-2 tracking-tight">
            {tickets?.filter(t => t.status === 'open' || !t.status).length || 0}
          </h3>
        </Card>

        <Card className="border shadow-sm rounded-[2rem] bg-white p-8">
          <div className="flex justify-between items-start mb-4">
            <div className="p-4 rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resolved Total</p>
          <h3 className="text-4xl font-black mt-2 tracking-tight">
            {tickets?.filter(t => t.status === 'resolved').length || 0}
          </h3>
        </Card>
      </div>

      <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-black px-10 h-20 uppercase tracking-widest text-[10px]">Customer</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px]">Inquiry Details</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px] text-right pr-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets?.map((ticket) => (
                <TableRow 
                  key={ticket.id} 
                  className="hover:bg-muted/5 transition-colors border-b last:border-none group cursor-pointer"
                  onClick={() => {
                    setSelectedId(ticket.id);
                    setTimeout(() => setIsDetailsOpen(true), 50);
                  }}
                >
                  <TableCell className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-foreground truncate">{ticket.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {ticket.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{ticket.message}</p>
                      <p className="text-[10px] text-muted-foreground font-bold italic">
                        {ticket.createdAt ? format(ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt), 'MMM dd, p') : 'Just now'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-wider border-none",
                      ticket.status === 'resolved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {ticket.status?.toUpperCase() || 'OPEN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex items-center justify-end gap-2">
                      {/* Resolve Button */}
                      {ticket.status !== 'resolved' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(ticket.id);
                          }}
                        >
                          Resolve
                        </Button>
                      )}

                      {/* Details Button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl font-bold text-primary hover:bg-primary/5 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>

                      {/* Delete Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-muted-foreground hover:text-destructive transition-all active:scale-90"
                        disabled={isDeletingId === ticket.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ticket.id);
                        }}
                      >
                        {isDeletingId === ticket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tickets?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24">
                    <div className="flex flex-col items-center opacity-30">
                      <MessageSquare className="w-20 h-20 mb-4" />
                      <p className="text-xl font-black italic">No support inquiries yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden border-none bg-[#FDFCFB]">
          {!activeTicket ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-bold text-muted-foreground">Synchronizing ticket data...</p>
            </div>
          ) : (
            <>
              <DialogHeader className="bg-primary p-10 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-3xl font-headline font-black">Support Inquiry</DialogTitle>
                    <p className="text-white/70 font-bold mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {activeTicket.createdAt ? format(activeTicket.createdAt.toDate ? activeTicket.createdAt.toDate() : new Date(activeTicket.createdAt), 'MMMM dd, yyyy') : 'Recently received'}
                    </p>
                  </div>
                  <Badge className={cn(
                    "rounded-full px-4 py-1.5 font-black text-[10px] uppercase border-none",
                    activeTicket.status === 'resolved' ? "bg-white text-green-600" : "bg-white text-orange-600"
                  )}>
                    {activeTicket.status?.toUpperCase() || 'OPEN'}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Customer Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{activeTicket.name}</p>
                        <p className="text-[10px] text-muted-foreground">Name</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground truncate">{activeTicket.email}</p>
                        <p className="text-[10px] text-muted-foreground">Email</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Conversation History</p>
                  <ScrollArea className="h-[300px] w-full rounded-2xl border bg-white p-4 shadow-inner">
                    <div className="space-y-6">
                      {/* Original Message */}
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="bg-muted p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-sm border">
                          <p className="font-black text-[10px] text-muted-foreground uppercase mb-1 tracking-tighter">{activeTicket.name}</p>
                          {activeTicket.message}
                        </div>
                        <span className="text-[9px] text-muted-foreground font-bold px-1 opacity-60">
                          {activeTicket.createdAt && format(activeTicket.createdAt.toDate ? activeTicket.createdAt.toDate() : new Date(activeTicket.createdAt), 'MMM dd, p')}
                        </span>
                      </div>

                      {/* Replies Array */}
                      {(activeTicket.replies || []).map((reply: any, i: number) => (
                        <div key={i} className={cn("flex flex-col gap-1.5", reply.sender === 'admin' ? "items-end" : "items-start")}>
                          <div className={cn(
                            "p-4 rounded-2xl text-sm max-w-[85%] shadow-sm",
                            reply.sender === 'admin' 
                              ? "bg-primary text-white rounded-tr-none" 
                              : "bg-muted rounded-tl-none border"
                          )}>
                            <p className={cn(
                              "font-black text-[10px] uppercase mb-1 tracking-tighter",
                              reply.sender === 'admin' ? "text-white/70" : "text-muted-foreground"
                            )}>
                              {reply.sender === 'admin' ? "System Concierge" : activeTicket.name}
                            </p>
                            {reply.text}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-bold px-1 opacity-60">
                            {reply.createdAt && format(reply.createdAt.toDate ? reply.createdAt.toDate() : new Date(reply.createdAt), 'MMM dd, p')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Type reply here..."
                      className="rounded-xl h-12 bg-white border border-gray-300"
                      value={replyText || ""}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReply();
                      }}
                    />
                  
                    <Button 
                      onClick={handleReply}
                      disabled={!activeTicket?.id || !replyText.trim()}
                      className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg p-0 shrink-0 transition-transform active:scale-90"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex gap-2">
                      {activeTicket && activeTicket.status !== 'resolved' && (
                        <Button 
                          variant="default"
                          className="rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white h-11"
                          onClick={() => handleResolve(activeTicket.id)}
                        >
                          Resolve
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        className="rounded-xl font-bold text-destructive hover:bg-destructive/5 h-11"
                        disabled={isDeletingId === activeTicket.id}
                        onClick={() => handleDelete(activeTicket.id)}
                      >
                        {isDeletingId === activeTicket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      className="rounded-xl font-bold border-primary text-primary h-11"
                      onClick={() => setIsDetailsOpen(false)}
                    >
                      Close Console
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
