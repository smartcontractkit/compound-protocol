import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { CTokenMethods, CTokenScenarioMethods } from './CToken';

interface CPoRDelegateMethods extends CTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface CPoRDelegateScenarioMethods extends CTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface CPoRScenarioMethods extends CPoRDelegateScenarioMethods {
  _setFeed(newFeed: string): Sendable<void>;
  _setHeartbeat(newHeartbeat: string): Sendable<void>;
}

export interface CPoRDelegate extends Contract {
  methods: CPoRDelegateMethods;
  name: string;
}

export interface CPoRDelegateScenario extends Contract {
  methods: CPoRDelegateScenarioMethods;
  name: string;
}
