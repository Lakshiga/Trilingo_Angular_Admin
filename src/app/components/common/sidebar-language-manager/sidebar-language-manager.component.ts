import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../services/language.service';
import { LanguageCode, LanguageConfig } from '../../../types/multilingual.types';

@Component({
  selector: 'app-sidebar-language-manager',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './sidebar-language-manager.component.html',
  styleUrls: ['./sidebar-language-manager.component.css']
})
export class SidebarLanguageManagerComponent implements OnInit {
  constructor(private languageService: LanguageService) {}

  ngOnInit() {}
}
