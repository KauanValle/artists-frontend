import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { conversationsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/badges'
import { cn, formatDateTime } from '@/lib/utils'
import { extractApiError } from '@/services/api'

export function ConversationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await conversationsApi.list()).data,
    refetchInterval: 15_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {id && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/contractor/conversas')}>
            <ArrowLeft />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Conversas</h1>
          <p className="text-sm text-muted-foreground">Uma conversa por contratação</p>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : conversations.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa"
          description="As conversas são criadas junto com cada solicitação de contratação."
          icon={<MessageSquare />}
        />
      ) : id ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => navigate(`/contractor/conversas/${conversation.id}`)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                  conversation.id === id ? 'border-primary bg-accent' : 'hover:bg-accent'
                )}
              >
                <Avatar alt={conversation.otherUserName} className="h-6 w-6" />
                {conversation.otherUserName}
                {conversation.unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <ChatConversation conversationId={id} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} to={`/contractor/conversas/${conversation.id}`}>
              <Card className="hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar alt={conversation.otherUserName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium">{conversation.otherUserName}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessage ?? 'Sem mensagens'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatConversation({ conversationId }: { conversationId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => (await conversationsApi.get(conversationId)).data,
    refetchInterval: 5000,
  })

  const send = useMutation({
    mutationFn: (content: string) => conversationsApi.send(conversationId, content),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  if (!data) return null

  return (
    <Card className="flex h-[520px] flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Avatar alt={data.conversation.otherUserName} className="h-7 w-7" />
          {data.conversation.otherUserName}
        </CardTitle>
      </CardHeader>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {data.messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">Envie a primeira mensagem.</p>
        )}
        {data.messages.map((message) => {
          const mine = message.senderUserId === user?.id
          return (
            <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[70%] rounded-lg px-3 py-2 text-sm', mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <p className="whitespace-pre-line">{message.content}</p>
                <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {formatDateTime(message.sentAt)}
                  {mine && (message.isRead ? ' • lida' : ' • enviada')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate(text.trim())
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." />
        <Button type="submit" size="icon" disabled={send.isPending || !text.trim()}>
          <Send />
        </Button>
      </form>
    </Card>
  )
}
