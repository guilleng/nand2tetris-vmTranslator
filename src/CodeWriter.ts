import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CommandType } from './Parser';
import { StackArithmetic } from './translations/StackArithmetic';
import { MemoryAccess } from './translations/MemoryAccess';
import { ProgramFlow } from './translations/ProgramFlow';
import { FunctionCalls } from './translations/FunctionCalls';

async function writeCode(filePath: string, data: string):Promise<void> {
    fsPromises.appendFile(filePath, data, 'ascii');
}

export class CodeWriter {
  private filePath: string;
	private labelCount: number;
	private callCount: number;
	private fileName: string;

  constructor(output: string) {
    this.filePath = output;
		this.labelCount = 0;
		this.callCount = 0;
    this.fileName = path.basename(this.filePath, path.extname(this.filePath)); 
  }


  public async setFileName(fileName: string) {
    this.fileName = fileName;
  }

  public async writeInit() {

    const asmCode = `      @256
      D=A
      @SP
      M=D
      ` + FunctionCalls.call("Sys.init", 0, 0);
      
    await writeCode(this.filePath, asmCode);
  }

  public async writeLabel(label: string) {
    const asmCode = ProgramFlow.label(label, this.fileName);
    await writeCode(this.filePath, asmCode);
  }

  public async writeGoto(label: string) {
    const asmCode = ProgramFlow.goto(label, this.fileName);
    await writeCode(this.filePath, asmCode);
  }

  public async writeIf(label: string) {
    const asmCode = ProgramFlow.if(label, this.fileName);
    await writeCode(this.filePath, asmCode);
  }
  
  public async writeCall(functionName: string, numArgs: number) {
    this.callCount += 1;

    const asmCode = FunctionCalls.call(functionName, numArgs, this.callCount);
    await writeCode(this.filePath, asmCode);
  }

  public async writeReturn() {
    const asmCode = FunctionCalls.wreturn();
    await writeCode(this.filePath, asmCode);
  }

  public async writeFunction(functionName: string, numLocals: number) {
    const asmCode = FunctionCalls.function(functionName, numLocals);
    await writeCode(this.filePath, asmCode);
  }
	
  public async writeArithmetic(command: string) {
    let asmCode: string;

    switch (command) {
    case "neg":
    case "not":
      asmCode = StackArithmetic.unaryComputation(command);
      break;

    case "add":
    case "sub":
    case "and":
    case "or":
      asmCode = StackArithmetic.binayComputation(command);
      break;

    case "eq":
    case "gt":
    case "lt":
      const counter: string = ""+this.labelCount++;
      asmCode = StackArithmetic.conditionalComputation(command, counter);
      break;

    default:
      throw new Error(`${command}`);
    }

    await writeCode(this.filePath, asmCode);
  }

  public async writePushPop(command: CommandType, segment: string, index: number) {
    let asmCode: string;

    if (command === "C_PUSH") {

      switch (segment) {
      case "constant":
        asmCode = StackArithmetic.pushConstant(index);
        break;

      case "local":
      case "argument":
      case "this":
      case "that":
        asmCode = MemoryAccess.pushSymbol(segment, index);
        break;

      case "pointer":
      case "temp":
        asmCode = MemoryAccess.pushRegister(segment, index);
        break;

      case "static":
        asmCode = MemoryAccess.pushStatic(index, this.fileName);
        break;

      default:
        throw new Error(`${segment} is not a valid segment`);
        break;
      }
    } else if (command === "C_POP") {

      switch (segment) {
      case "local":
      case "argument":
      case "this":
      case "that":
        asmCode = MemoryAccess.popSymbol(segment, index);
        break;

      case "pointer":
      case "temp":
        asmCode = MemoryAccess.popRegister(segment, index);
        break;

      case "static":
        asmCode = MemoryAccess.popStatic(index, this.fileName);
        break;

      default:
        throw new Error(`${segment} is not a valid segment`);
        break;
      }
    } else {

      throw new Error(`${command} neither push nor pop`);
    }

    await writeCode(this.filePath, asmCode);
  }
}
