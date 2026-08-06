/*
 * Copyright (C) 2025 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.telematic.telematic_rsu_management_service.data_selection.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.service.DataSelectionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/data-selection")
public class DataSelectionController {
    private final DataSelectionService dataSelectionService;
    public DataSelectionController(DataSelectionService dataSelectionService) {
        this.dataSelectionService = dataSelectionService;
    }

    @GetMapping("/available-topics")
    public ResponseEntity<?> getAvailableTopics(@Valid @RequestBody TRUTopicsMessage truTopicsMessage) {
         TRUTopicsMessage response = dataSelectionService.requestAvailableTopics(truTopicsMessage);
         return ResponseEntity.ok().body(response);
    }

    @PostMapping("/confirm-topics")
    public ResponseEntity<?> confirmDataSelection(@Valid @RequestBody TRUTopicsMessage truTopicsMessage) {
        TRUTopicsMessage response = dataSelectionService.requestDataSelection(truTopicsMessage);
        return ResponseEntity.ok().body(response);
    }
}
