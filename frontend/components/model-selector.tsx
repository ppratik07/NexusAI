"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Brain, Zap, Star, Check, ChevronDown } from "lucide-react"

interface AIModel {
  id: string
  name: string
  description: string
  provider: string
  capabilities: string[]
  speed: "Fast" | "Medium" | "Slow"
  quality: "High" | "Medium" | "Standard"
  isPopular?: boolean
}

const availableModels: AIModel[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "Most capable model for complex reasoning and creative tasks",
    provider: "OpenAI",
    capabilities: ["Reasoning", "Creative Writing", "Code Generation", "Analysis"],
    speed: "Medium",
    quality: "High",
    isPopular: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and efficient for most conversational tasks",
    provider: "OpenAI",
    capabilities: ["Conversation", "Quick Tasks", "Code Help"],
    speed: "Fast",
    quality: "Medium",
  },
  {
    id: "claude-3",
    name: "Claude 3",
    description: "Excellent for analysis, writing, and thoughtful responses",
    provider: "Anthropic",
    capabilities: ["Analysis", "Writing", "Research", "Safety"],
    speed: "Medium",
    quality: "High",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    description: "Google's advanced model for multimodal understanding",
    provider: "Google",
    capabilities: ["Multimodal", "Reasoning", "Code", "Math"],
    speed: "Fast",
    quality: "High",
    isPopular: true,
  },
]

interface ModelSelectorProps {
  selectedModel: string
  onModelSelect: (modelId: string) => void
}

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentModel = availableModels.find((model) => model.id === selectedModel) || availableModels[0]

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId)
    setIsOpen(false)
  }

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "Fast":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Slow":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "High":
        return "bg-primary/10 text-primary"
      case "Medium":
        return "bg-secondary/10 text-secondary-foreground"
      case "Standard":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px] bg-card text-card-foreground border-border">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>{currentModel.name}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Select AI Model</DialogTitle>
          <DialogDescription>Choose the AI model that best fits your needs</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {availableModels.map((model) => (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                selectedModel === model.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
              onClick={() => handleModelSelect(model.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg text-card-foreground">{model.name}</CardTitle>
                    {model.isPopular && (
                      <Badge variant="secondary" className="bg-accent text-accent-foreground">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  {selectedModel === model.id && <Check className="h-5 w-5 text-primary" />}
                </div>
                <div className="text-sm text-muted-foreground">{model.provider}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed">{model.description}</CardDescription>

                <div className="flex gap-2">
                  <Badge className={getSpeedColor(model.speed)}>{model.speed}</Badge>
                  <Badge className={getQualityColor(model.quality)}>{model.quality} Quality</Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-card-foreground">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {model.capabilities.map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs border-border">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Pro Tip:</strong> Different models excel at different tasks. GPT-4 is
              best for complex reasoning, while GPT-3.5 Turbo is faster for simple conversations. You can switch models
              anytime during your conversation.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
