"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hello! I am your AIVF assistant. How can I help you today?",
    },
    {
      from: "user",
      text: "I am feeling a bit nauseous after my injection. Is that normal?",
    },
    {
      from: "bot",
      text: "Nausea can be a common side effect for some of the medications. However, if it is severe or you have other concerns, you should contact your clinic. Would you like me to send an alert?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() !== "") {
      setMessages([...messages, { from: "user", text: input }]);
      // Here you would typically send the message to the backend and get a response
      setInput("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <h1 className="mb-4 text-3xl font-bold">AI Assistant</h1>
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${message.from === "user" ? "justify-end" : ""}`}
              >
                {message.from === "bot" && (
                  <Avatar>
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-xs rounded-lg p-3 ${message.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p>{message.text}</p>
                </div>
                {message.from === "user" && (
                  <Avatar>
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
