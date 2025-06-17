/*******************************************************************************
 * Copyright (c) 2023 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)
 * Copyright (c) 2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ******************************************************************************/

/*eslint-disable @typescript-eslint/no-explicit-any*/

import { Injectable } from '@angular/core';
import {
  Action,
  AtomicConstraint,
  ConstraintTemplate,
  LeftOperand,
  LogicalConstraint,
  LogicalOperator,
  Operator,
  OutputKind,
  PolicyConfiguration,
  ValueKind,
} from '../models/policy';
import {
  bpnConstraint,
  bpnGroupConstraint,
  credentialsConstraints,
  inForceDurationConstraint,
  inForceFixedConstraint,
  // Data Processor variants
  dataProcessorExternalConstraint,
  dataProcessorInternalConstraint,
  // Fixed Date and BPN Group variants
  fixedDateAndBpnGroupExternalConstraint,
  fixedDateAndBpnGroupInternalConstraint,
  // Membership variants
  membershipExternalConstraint,
  membershipInternalConstraint,
  // Period from Contract variants
  periodFromContractExternalConstraint,
  periodFromContractInternalConstraint,
} from './constraints';

export const NAMESPACES: any = {
  edc: 'https://w3id.org/edc/v0.0.1/ns/',
  tx: 'https://w3id.org/tractusx/v0.0.1/ns/',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  odrl: 'http://www.w3.org/ns/odrl/2/',
  'i3b-policy': 'https://w3id.org/i3b-mvd/policy/',
};

@Injectable({ providedIn: 'root' })
export class PolicyService {
  logicalOperators(): string[] {
    return this.values(LogicalOperator);
  }

  operators(): string[] {
    return this.values(Operator);
  }

  valueKinds(): string[] {
    return this.values(ValueKind);
  }

  actions(): string[] {
    return this.values(Action);
  }

  supportedOutput(): string[] {
    return this.values(OutputKind);
  }

  private values(val: object): string[] {
    return Object.values(val).filter(value => typeof value === 'string') as string[];
  }

  constraintTemplates(): ConstraintTemplate[] {
    // const credentialConstraints = credentialsConstraints();

    // const credentialConstraintsTemplate = credentialConstraints.map(c => {
    //   return {
    //     name: c.get_label() + ' credential',
    //     multiple: false,
    //     factory: () => c,
    //   };
    // });

    return [
      // Constraints básicos
      {
        name: 'Atomic Constraint',
        multiple: false,
        factory: () => new AtomicConstraint(new LeftOperand('<field>'), Operator.Eq, '<value>'),
      },
      {
        name: 'Logical Constraint',
        multiple: true,
        factory: () => new LogicalConstraint(),
      },

      // BPN Constraints
      {
        name: 'BPN Constraint',
        multiple: false,
        factory: bpnConstraint,
      },
      {
        name: 'BPN Group Constraint',
        multiple: false,
        factory: bpnGroupConstraint,
      },

      // Data Processor Constraint (usando External por defecto)
      {
        name: 'Data Processor Constraint',
        multiple: false,
        factory: dataProcessorExternalConstraint,
      },

      // Membership Constraint (usando External por defecto)
      {
        name: 'Membership Constraint',
        multiple: false,
        factory: membershipExternalConstraint,
      },

      // ========== COMMENTED OUT CONSTRAINTS ==========
      // Fixed Date and BPN Group Constraints
      // {
      //   name: 'Fixed Date and BPN Group Constraint (External)',
      //   multiple: true,
      //   factory: fixedDateAndBpnGroupExternalConstraint,
      // },
      // {
      //   name: 'Fixed Date and BPN Group Constraint (Internal)',
      //   multiple: true,
      //   factory: fixedDateAndBpnGroupInternalConstraint,
      // },

      // Period from Contract Agreement and BPN Constraints
      // {
      //   name: 'Period from Contract and BPN Constraint (External)',
      //   multiple: true,
      //   factory: periodFromContractExternalConstraint,
      // },
      // {
      //   name: 'Period from Contract and BPN Constraint (Internal)',
      //   multiple: true,
      //   factory: periodFromContractInternalConstraint,
      // },

      // Time-based Constraints
      // {
      //   name: 'In Force Constraint (Duration)',
      //   multiple: true,
      //   factory: inForceDurationConstraint,
      // },
      // {
      //   name: 'In Force Constraint (Fixed)',
      //   multiple: true,
      //   factory: inForceFixedConstraint,
      // },

      // Credential constraints
      // ...credentialConstraintsTemplate,
    ];
  }

  namespacesFor(policy: PolicyConfiguration): any {
    const context: any = {};
    policy.policy.permissions
      .flatMap(permission => permission.constraints)
      .map(constraint => constraint.get_prefixes())
      .flat()
      .forEach(prefix => {
        const ns = NAMESPACES[prefix];
        context[prefix] = ns != null ? ns : `https://<${prefix}-namespace-here>`;
      });

    return context;
  }

  contextsFor(policy: PolicyConfiguration): string[] {
    const contexts = policy.policy.permissions
      .flatMap(permission => permission.constraints)
      .flatMap(constraint => constraint.get_contexts());

    return Array.from(new Set(contexts));
  }

  getContextsForPolicyType(policyName: string): string[] {
    const baseCONTEXTS = ['https://w3id.org/edc/connector/management/v0.0.1', 'http://www.w3.org/ns/odrl.jsonld'];

    if (policyName.includes('External')) {
      return [
        ...baseCONTEXTS,
        'https://raw.githubusercontent.com/imferna/json-ld-contexts/refs/heads/main/policy.context.jsonld',
      ];
    } else if (policyName.includes('Internal')) {
      return baseCONTEXTS;
    } else {
      // Default
      return baseCONTEXTS;
    }
  }

  getNamespacesForPolicyType(policyName: string): any {
    const baseNamespaces = {
      '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
    };

    if (policyName.includes('Internal')) {
      return {
        'i3b-policy': 'https://w3id.org/i3b-mvd/policy/',
        businessPartnerNumber: 'i3b-policy:businessPartnerNumber',
        MembershipCredential: 'i3b-policy:MembershipCredential',
        'DataAccess.level': 'i3b-policy:DataAccess.level',
        ...baseNamespaces,
      };
    } else if (policyName.includes('External')) {
      return baseNamespaces;
    } else {
      // Default
      return baseNamespaces;
    }
  }
}
