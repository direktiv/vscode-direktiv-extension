export const Schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "JSON Schema for Direktiv, a Serverless Workflow Engine",
    "description": "Workflow Linter to create easy workflows on Direktiv",
    "type": "object",
    "additionalProperties": false,
    "definitions": {
      "event" : {
        "required": ["type"],
        "type": "object",
        "properties":{
          "type":{
            "type":"string",
            "description":"CloudEvent Type"
          },
          "filters": {
            "type": "object",
            "description": "Key-value regex pairs for CloudEvent context values that must match."
          }
        }
      },
      "action": {
        "type": "object",
        "properties": {
          "function": {
            "type": "string"
          },
          "workflow": {
            "type": "string"
          },
          "input": {
            "type": "string"
          },
          "secrets": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      }
    },
    "required": ["id"],
    "properties": {
      "id": {
          "type": "string",
          "description": "The name of the workflow."
      },
      "description": {
          "type": "string",
          "description": "What does this workflow do?"
      },
      "name": {
          "type": "string",
          "description": "Name of the workflow"
      },
      "version": {
        "type": "string",
        "description": "Version of the workflow"
      },
      "singular": {
        "type": "boolean",
        "description": "Attempts to invoke this workflow will fail when an instance is running"
      },
      "timeouts": {
        "type": "object",
        "properties": {
          "interrupt": {
            "type": "string"
          },
          "kill": {
            "type": "string"
          }
        }
      },
      "start": {
        "type": "object",
        "enum": ["scheduled", "event"],
        "description": "The start definition of a workflow.",
        "required": ["type"],
        "properties": {
          "type": {
            "type": "string",
            "description": "The type of start event for the workflow"
          },
          "state": {
            "type": "string",
            "description": "the state the workflow enters on"
          }
        },
        "anyOf": [
          {
            "if": {"properties": {"type":{"const":"scheduled"}}},
            "then": {"properties": {"cron":{"type":"string", "description": "the cron time the workflow triggers"}}}
          },
          {
            "if": {"properties": {"type":{"const":"event"}}},
            "then": {
              "properties": {
                "event": {
                  "$ref": "#/definitions/event"
                }
              }
            }
          },
          {
            "if": {"properties": {"type":{"const":"eventsXor"}}},
            "then": {"required":["events"], "properties": {"events":{"type":"array", "items": {"$ref": "#/definitions/event"}}}}
          },
          {
            "if": {"properties": {"type":{"const":"eventsAnd"}}},
            "then": {"required": ["events"], "properties": {"events":{"type":"array", "items": {"$ref":"#/definitions/event"}, "lifespan":{"type":"string"}}}}
          }
        ] 
      },
      "states": {
        "type": "array",
        "description": "The states of a workflow",
        "items": [
          {
            "type": "object",
            "required": ["id", "type"],
            "description": "A state",
            "properties": {
              "id": {
                "type": "string",
                "description": "name of the state"
              },
              "type": {
                "enum": ["action", "consumeEvent", "delay", "error", "eventAnd", "eventXor", "foreach", "generateEvent", "getter", "noop", "parallel", "setter", "switch", "validate"],
                "type": "string",
                "description": "The type of the state"
              },
              "transform": {
                "type": "string",
                "description": "JQ Command to transform the state's data output"
              },
              "transition": {
                "type": "string",
                "description": "State to transition to next"
              },
              "log": {
                "type": "string",
                "description": "jq command to generate data for instance-logging"
              },
              "retries": {
                "type": "object",
                "required": ["maxAttempts"],
                "properties": {
                  "maxAttempts": {
                    "type": "integer"
                  },
                  "delay": {
                    "type": "string",
                    "description": "Time delay between retry attempts."	
                  },
                  "multiplier": {
                    "type": "number"
                  },
                  "throw": {
                    "type": "string"
                  }
                }
              },
              "catch": {
                "type": "object",
                "required": ["error"],
                "properties": {
                  "error": {
                    "type": "string"
                  },
                  "transition": {
                    "type": "string"
                  }
                }
              }
            },
            "anyOf": [
              {
                "if": {"properties": {"type":{"const":"action"}}},
                "then": {"properties": {
                    "async": {
                      "type": "boolean"
                    },
                    "action": { "$ref": "#/definitions/action"}
                }}
              },
              {
                "if": {"properties": {"type":{"const":"consumeEvent"}}},
                "then": {"required":["event"],"properties": {"event": {
                  "$ref": "#/definitions/event"
                }, "timeout": {"type":"string"}}}
              },
              {
                "if": {"properties": {"type":{"const":"delay"}}},
                "then": {"properties": {"duration": {
                  "type": "string"
                }}}
              },
              {
                "if": {"properties": {"type":{"const":"error"}}},
                "then": {"required":["error"],"properties": {"error":{"type":"string"}, "message":{"type":"string"}, "args":{"type":"array", "items": [{"type":"string"}]}}}
              },
              {
                "if": {"properties": {"type":{"const":"eventAnd"}}},
                "then": {"required":["events"], "properties": {"events": {"type":"array", "items":[{"$ref": "#/definitions/event"}]}, "timeout":{"type":"string"} }}
              },
              {
                "if": {"properties": {"type":{"const":"eventXor"}}},
                "then": {"required":["events"], "properties": {"events": {"event": {"$ref": "#/definitions/event"}, "transition":{"type":"string"}, "transform":{"type":"string"}}, "timeout":{"type":"string"} }}
              },
              {
                "if": {"properties": {"type":{"const":"foreach"}}},
                "then": {"required":["array", "action"],"properties": {"array":{"type":"string"}, "action": {"$ref":"#/definitions/action"}, "timeout":{"type":"string"}}}
              },
              {
                "if": {"properties": {"type":{"const":"generateEvent"}}},
                "then": {"required":["event"], "properties": {"event": {"type":"object", "properties": {"type":{"type":"string"}, "source":{"type":"string"}, "data":{"type":"string"}, "datacontenttype":{"type":"string"}, "context":{"type":"object"}}}}}
              },
              {
                "if": {"properties": {"type":{"const":"getter"}}},
                "then": {"required":["variables"], "properties": {"variables": {"type":"object","properties": {"key":{"type":"string"}, "scope":{"type":"string", "enum": ["instance", "workflow", "namespace"]}}}}}
              },
              {
                "if": {"properties": {"type":{"const":"noop"}}}
              },
              {
                "if": {"properties": {"type":{"const":"parallel"}}},
                "then": {"required":["actions"], "properties": {"timeout":{"type":"string"},"actions": {"type":"array", "items": {"$ref":"#/definitions/action"}}, "mode":{"type":"string","enum": ["and","or"]}}}
              },
              {
                "if": {"properties": {"type":{"const":"setter"}}},
                "then": {"required":["variables"], "properties": {"variables":{"type":"object", "properties": {"key":{"type":"string"}, "scope":{"type":"string", "enum": ["instance", "workflow", "namespace"]}, "value":{"type":"string"}}}}}
              },
              {
                "if": {"properties": {"type":{"const":"switch"}}},
                "then": {"required":["conditions"], "properties": {"conditions": {"type":"array", "items":{"type":"object", "properties": {"condition":{"type":"string"}, "transition":{"type":"string"}, "transform":{"type":"string"}}}}}}
              },
              {
                "if": {"properties": {"type":{"const":"validate"}}},
                "then": {"required":["schema"], "properties": {"subject":{"type":"string"}, "schema":{"type":"string"}}}
              }
            ]
          }
        ]
      },
      "schemas": {
        "type": "array",
        "required": ["id"],
        "items": [{
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "schema": {
              "type": "object"
            }
          }
        }]
      },
      "functions": {
        "type": "array",
        "items": [
          {
            "type": "object",
            "required": ["id", "image"],
            "properties": {
              "id": {
                "type": "string"
              },
              "image": {
                "type": "string"
              },
              "cmd": {
                "type": "string"
              },
              "size": {
                "type": "string",
                "enum": ["small", "medium", "large"]
              },
              "scale": {
                "type": "integer"
              }
            }
          }
        ]
      }
    }
  }