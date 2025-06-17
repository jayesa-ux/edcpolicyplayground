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

import {
  AtomicConstraint,
  Constraint,
  LogicalConstraint,
  Permission,
  PolicyConfiguration,
  Value,
} from 'src/app/models/policy';
import { JsonLdFormatter } from '../format.service';
import { PolicyService } from '../policy.service';

export const policyRequestTemplate = {
  '@context': {},
  '@type': 'PolicyDefinition',
  '@id': '{{POLICY_ID}}',
  policy: {},
};

const policyHeader = {
  '@type': 'Set',
};

export const emptyPolicy = Object.assign(policyRequestTemplate, {
  policy: {
    ...policyHeader,
    permission: [],
  },
});

export class PlainFormatter implements JsonLdFormatter {
  policyService: PolicyService;

  constructor(policyService: PolicyService) {
    this.policyService = policyService;
  }

  toJsonLd(policyConfig: PolicyConfiguration): object {
    const policyType = this.getPolicyType(policyConfig.name);
    const contextType = this.getContextType(policyConfig.name);

    return this.createStandardFormat(policyConfig, policyType, contextType);
  }

  private getPolicyType(
    policyName: string,
  ): 'dataprocessor' | 'fixeddateandbnpgroup' | 'membership' | 'period' | 'other' {
    const name = policyName.toLowerCase();
    if (name.includes('dataprocessor')) return 'dataprocessor';
    if (name.includes('fixeddateandbnpgroup')) return 'fixeddateandbnpgroup';
    if (name.includes('membership')) return 'membership';
    if (name.includes('period')) return 'period';
    return 'other';
  }

  private getContextType(policyName: string): 'external' | 'internal' {
    const name = policyName.toLowerCase();
    if (name.includes('external')) return 'external';
    if (name.includes('internal')) return 'internal';
    return 'external'; // Default to external
  }

  private createStandardFormat(policyConfig: PolicyConfiguration, policyType: string, contextType: string): object {
    const permissions = policyConfig.policy.permissions.map(this.mapPermission.bind(this));
    const context = this.buildContext(policyType, contextType);

    // DataProcessor usa obligation, otros usan permission
    const policyContent =
      policyType === 'dataprocessor'
        ? { '@type': 'Set', obligation: permissions }
        : { '@type': 'Set', permission: permissions };

    return {
      '@context': context,
      '@id': this.generatePolicyId(policyConfig.name),
      '@type': 'PolicyDefinition',
      policy: policyContent,
    };
  }

  private buildContext(policyType: string, contextType: string): any[] {
    const baseContexts = ['http://www.w3.org/ns/odrl.jsonld'];

    if (contextType === 'external') {
      return [
        ...baseContexts,
        'https://raw.githubusercontent.com/imferna/json-ld-contexts/refs/heads/main/policy.context.jsonld',
        'https://w3id.org/edc/connector/management/v0.0.1',
        {
          '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        },
      ];
    } else if (contextType === 'internal') {
      return [
        ...baseContexts,
        'https://raw.githubusercontent.com/imferna/json-ld-contexts/refs/heads/main/policy.context.jsonld',
        {
          'i3b-policy': 'https://w3id.org/i3b-mvd/policy/',
          businessPartnerNumber: 'i3b-policy:businessPartnerNumber',
          MembershipCredential: 'i3b-policy:MembershipCredential',
          'DataAccess.level': 'i3b-policy:DataAccess.level',
          '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        },
      ];
    } else {
      // Default context
      return [
        ...baseContexts,
        {
          '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        },
      ];
    }
  }

  private generatePolicyId(policyName: string): string {
    if (policyName.toLowerCase().includes('dataprocessor')) {
      return 'require-dataprocessor';
    } else if (policyName.toLowerCase().includes('membership')) {
      return 'require-membership';
    } else if (policyName.toLowerCase().includes('bpn')) {
      return 'require-bpn';
    } else {
      return '{{POLICY_ID}}';
    }
  }

  mapPermission(permission: Permission): object {
    return {
      action: permission.action.toString(),
      constraint:
        permission.constraints.length === 1
          ? this.mapConstraint(permission.constraints[0])
          : permission.constraints.map(this.mapConstraint.bind(this)),
    };
  }

  mapConstraint(constraint: Constraint): object {
    if (constraint instanceof AtomicConstraint) {
      return {
        leftOperand: constraint.leftOperand.toString(),
        operator: constraint.operator.toString(),
        rightOperand: this.mapRightOperand(constraint),
      };
    } else if (constraint instanceof LogicalConstraint) {
      return {
        [constraint.operator.toString().toLowerCase()]: constraint.constraints.map(this.mapConstraint.bind(this)),
      };
    }

    return {};
  }

  mapRightOperand(constraint: AtomicConstraint): string | number | object | any[] | undefined {
    if (constraint.rightOperand instanceof Value) {
      return {
        '@value': constraint.rightOperand.value,
        '@type': constraint.rightOperand.ty,
      };
    } else if (Array.isArray(constraint.rightOperand)) {
      return constraint.rightOperand;
    } else {
      return constraint.rightOperand;
    }
  }
}
